import json
import pandas as pd
from services.ai_service import analyze_document


def generate_financial_statements(parsed_data: dict) -> dict:
    """
    Takes parsed CSV/Excel bank data and generates
    P&L, balance sheet, and cash flow automatically.
    """

    # Step 1 — Convert parsed data into a Pandas DataFrame
    rows = parsed_data.get("data", [])
    if not rows:
        return {"error": "No data found in file"}

    df = pd.DataFrame(rows)

    # Step 2 — Detect the amount column
    amount_col = detect_column(df, ["amount", "value", "importe", "cantidad", "sum"])
    date_col = detect_column(df, ["date", "fecha", "day", "time"])
    desc_col = detect_column(df, ["description", "descripcion", "concept", "concepto", "details", "name"])

    if not amount_col:
        return {"error": "Could not find an amount column in the file"}

    # Step 3 — Clean and convert amounts to numbers
    df[amount_col] = pd.to_numeric(
        df[amount_col].astype(str).str.replace(",", ".").str.replace("[^0-9.-]", "", regex=True),
        errors="coerce"
    ).fillna(0)

    # Step 4 — Separate income and expenses
    income_df = df[df[amount_col] > 0]
    expense_df = df[df[amount_col] < 0]

    total_income = round(income_df[amount_col].sum(), 2)
    total_expenses = round(abs(expense_df[amount_col].sum()), 2)
    net_profit = round(total_income - total_expenses, 2)
    profit_margin = round((net_profit / total_income * 100), 2) if total_income > 0 else 0

    # Step 5 — Build P&L statement
    pl_statement = {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "profit_margin_percent": profit_margin,
        "income_transactions": len(income_df),
        "expense_transactions": len(expense_df),
    }

    # Step 6 — Top expenses breakdown
    top_expenses = []
    if desc_col:
        expense_by_desc = expense_df.groupby(desc_col)[amount_col].sum().abs()
        top_expenses = [
            {"description": k, "amount": round(v, 2)}
            for k, v in expense_by_desc.nlargest(10).items()
        ]

    # Step 7 — Cash flow over time
    cash_flow = []
    if date_col:
        try:
            df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
            df_sorted = df.dropna(subset=[date_col]).sort_values(date_col)
            df_sorted["running_balance"] = df_sorted[amount_col].cumsum()
            cash_flow = [
                {
                    "date": str(row[date_col].date()),
                    "amount": row[amount_col],
                    "balance": round(row["running_balance"], 2)
                }
                for _, row in df_sorted.iterrows()
            ]
        except Exception:
            cash_flow = []

    # Step 8 — Send to Claude for narrative and insights
    ai_analysis = analyze_document(parsed_data, "finance")

    return {
        "pl_statement": pl_statement,
        "top_expenses": top_expenses,
        "cash_flow": cash_flow,
        "ai_analysis": ai_analysis,
        "status": "complete"
    }


def detect_column(df: pd.DataFrame, candidates: list) -> str | None:
    """
    Finds the first column name that matches any of the candidates.
    Case insensitive.
    """
    for col in df.columns:
        if col.lower() in candidates:
            return col
    return None