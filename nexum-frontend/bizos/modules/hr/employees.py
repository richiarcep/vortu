from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base
from services.ai_service import analyze_document


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    department = Column(String, nullable=True)
    position = Column(String, nullable=True)
    gross_salary = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", backref="employees")
    feedback = relationship("EmployeeFeedback", back_populates="employee")


class EmployeeFeedback(Base):
    __tablename__ = "employee_feedback"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    content = Column(String, nullable=False)
    sentiment = Column(String, nullable=True)  # positive, neutral, negative
    sentiment_score = Column(Float, nullable=True)  # -1.0 to 1.0
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee", back_populates="feedback")


def analyze_feedback(feedback_list: list) -> dict:
    """
    Takes a list of employee feedback strings and runs
    sentiment analysis using Claude.
    """
    if not feedback_list:
        return {"error": "No feedback provided"}

    # Build data structure for Claude
    feedback_data = {
        "type": "employee_feedback",
        "total_comments": len(feedback_list),
        "data": [{"comment": f} for f in feedback_list]
    }

    prompt_data = {
        "type": "csv",
        "rows": len(feedback_list),
        "columns": ["comment"],
        "data": feedback_data["data"],
        "summary": {"total_rows": len(feedback_list), "numeric_columns": []}
    }

    # Use Claude to analyze sentiment
    from anthropic import Anthropic
    from core.config import get_settings

    settings = get_settings()
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    feedback_text = "\n".join([f"- {f}" for f in feedback_list])

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": f"""Analyze these employee feedback comments and return a JSON object:

{{
    "overall_sentiment": "positive|neutral|negative",
    "sentiment_score": <number from -1.0 to 1.0>,
    "summary": "<2-3 sentence summary of overall employee mood>",
    "positive_themes": ["<theme 1>", "<theme 2>"],
    "negative_themes": ["<theme 1>", "<theme 2>"],
    "urgent_issues": ["<any issue that needs immediate attention>"],
    "recommendations": ["<actionable HR recommendation>"]
}}

Return ONLY the JSON object.

Feedback comments:
{feedback_text}"""
        }]
    )

    import json
    try:
        return json.loads(message.content[0].text)
    except json.JSONDecodeError:
        return {"raw_analysis": message.content[0].text}
    