import re
from services.ai_service import analyze_document


def process_invoice(parsed_data: dict) -> dict:
    """
    Takes parsed PDF invoice data and extracts
    vendor, amount, date, and line items automatically.
    """

    # Step 1 — Extract all text from the PDF
    text_content = parsed_data.get("text_content", [])
    tables = parsed_data.get("tables", [])

    full_text = " ".join([page["text"] for page in text_content])

    # Step 2 — Try to extract key fields using pattern matching
    vendor = extract_vendor(full_text)
    total_amount = extract_amount(full_text)
    invoice_date = extract_date(full_text)
    invoice_number = extract_invoice_number(full_text)

    # Step 3 — Extract line items from tables
    line_items = []
    for table in tables:
        for row in table:
            values = list(row.values())
            if len(values) >= 2:
                line_items.append({
                    "description": str(values[0]),
                    "amount": str(values[-1])
                })

    # Step 4 — Send to Claude for full analysis
    ai_analysis = analyze_document(parsed_data, "finance")

    return {
        "vendor": vendor,
        "total_amount": total_amount,
        "invoice_date": invoice_date,
        "invoice_number": invoice_number,
        "line_items": line_items,
        "ai_analysis": ai_analysis,
        "status": "complete"
    }


def extract_vendor(text: str) -> str | None:
    """Tries to find the vendor/company name in invoice text."""
    patterns = [
        r"(?:from|vendor|supplier|company|empresa|proveedor)[:\s]+([A-Za-z0-9\s&.,]+)",
        r"^([A-Z][A-Za-z0-9\s&.,]{2,50})\n",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            return match.group(1).strip()
    return None


def extract_amount(text: str) -> float | None:
    """Tries to find the total amount in invoice text."""
    patterns = [
        r"(?:total|amount due|importe total|total a pagar)[:\s]*[$€£]?\s*([\d,]+\.?\d*)",
        r"(?:grand total|subtotal)[:\s]*[$€£]?\s*([\d,]+\.?\d*)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1).replace(",", ""))
            except ValueError:
                continue
    return None


def extract_date(text: str) -> str | None:
    """Tries to find the invoice date in the text."""
    patterns = [
        r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b",
        r"\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b",
        r"(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def extract_invoice_number(text: str) -> str | None:
    """Tries to find the invoice number in the text."""
    patterns = [
        r"(?:invoice|factura|invoice no|invoice #)[:\s#]*([A-Z0-9-]+)",
        r"(?:ref|reference|numero)[:\s]*([A-Z0-9-]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None