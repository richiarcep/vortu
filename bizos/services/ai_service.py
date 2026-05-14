import anthropic
import json
from core.config import get_settings

settings = get_settings()


def get_client():
    """Creates and returns an Anthropic client."""
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def analyze_document(parsed_data: dict, module: str) -> dict:
    """
    Sends parsed document data to Claude and returns structured insights.
    Module determines what kind of analysis to perform.
    """
    client = get_client()

    prompt = build_prompt(parsed_data, module)

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    raw_response = message.content[0].text

    # Try to parse as JSON, fall back to wrapping in a dict
    try:
        return json.loads(raw_response)
    except json.JSONDecodeError:
        return {"raw_analysis": raw_response}


def build_prompt(parsed_data: dict, module: str) -> str:
    """
    Builds the correct prompt based on the business module.
    """
    data_str = json.dumps(parsed_data, indent=2, default=str)

    if module == "finance":
        return f"""You are a professional financial analyst. Analyze this business financial data and return a JSON object with the following structure:

{{
    "summary": "2-3 sentence plain English summary of the financial situation",
    "total_income": <number or null>,
    "total_expenses": <number or null>,
    "net_profit": <number or null>,
    "currency": "<detected currency or 'unknown'>",
    "period": "<detected time period or 'unknown'>",
    "top_expense_categories": [
        {{"category": "<name>", "amount": <number>}}
    ],
    "anomalies": [
        {{"description": "<what is unusual>", "severity": "low|medium|high"}}
    ],
    "recommendations": [
        "<actionable recommendation as a string>"
    ],
    "health_score": <number 1-10>
}}

Return ONLY the JSON object, no explanation, no markdown, no code blocks.

Data to analyze:
{data_str}"""

    elif module == "hr":
        return f"""You are a professional HR and payroll specialist. Analyze this employee/payroll data and return a JSON object with the following structure:

{{
    "summary": "2-3 sentence plain English summary",
    "total_employees": <number or null>,
    "total_payroll": <number or null>,
    "currency": "<detected currency or 'unknown'>",
    "average_salary": <number or null>,
    "payroll_breakdown": [
        {{"department": "<name>", "headcount": <number>, "total_cost": <number>}}
    ],
    "anomalies": [
        {{"description": "<what is unusual>", "severity": "low|medium|high"}}
    ],
    "recommendations": [
        "<actionable recommendation as a string>"
    ]
}}

Return ONLY the JSON object, no explanation, no markdown, no code blocks.

Data to analyze:
{data_str}"""

    elif module == "marketing":
        return f"""You are a professional marketing strategist. Analyze this business data and return a JSON object with the following structure:

{{
    "summary": "2-3 sentence plain English summary",
    "insights": [
        "<key insight about the business as a string>"
    ],
    "campaign_ideas": [
        {{
            "title": "<campaign name>",
            "objective": "<what it achieves>",
            "channel": "<email|social|paid|content>",
            "estimated_budget": "<low|medium|high>"
        }}
    ],
    "target_audience": "<description of ideal customer based on data>",
    "recommendations": [
        "<actionable marketing recommendation>"
    ]
}}

Return ONLY the JSON object, no explanation, no markdown, no code blocks.

Data to analyze:
{data_str}"""

    else:
        return f"""Analyze this business data and return a JSON object with:
{{
    "summary": "<plain English summary>",
    "key_findings": ["<finding 1>", "<finding 2>"],
    "recommendations": ["<recommendation 1>", "<recommendation 2>"]
}}

Return ONLY the JSON object.

Data:
{data_str}"""