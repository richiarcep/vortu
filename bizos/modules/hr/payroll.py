import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
import os


def process_payroll(parsed_data: dict) -> dict:
    """
    Takes parsed employee/payroll data and calculates
    gross to net wages for every employee automatically.
    """

    # Step 1 — Load data into DataFrame
    rows = parsed_data.get("data", [])
    if not rows:
        # Try Excel sheets
        sheets = parsed_data.get("data", {})
        if isinstance(sheets, dict):
            for sheet_name, sheet_data in sheets.items():
                rows = sheet_data.get("data", [])
                if rows:
                    break

    if not rows:
        return {"error": "No employee data found in file"}

    df = pd.DataFrame(rows)
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    # Step 2 — Detect key columns
    name_col = detect_column(df, ["name", "nombre", "employee", "empleado",
                                   "full_name", "nombre_completo"])
    salary_col = detect_column(df, ["salary", "salario", "gross", "bruto",
                                     "wage", "sueldo", "amount", "importe"])
    dept_col = detect_column(df, ["department", "departamento", "dept", "area"])

    if not name_col or not salary_col:
        return {"error": "Could not find employee name or salary columns"}

    # Step 3 — Calculate payroll for each employee
    employees = []
    total_gross = 0
    total_net = 0
    total_tax = 0

    for _, row in df.iterrows():
        name = str(row.get(name_col, "Unknown"))
        try:
            gross = float(str(row.get(salary_col, 0)).replace(",", ".").replace("[^0-9.]", ""))
        except (ValueError, TypeError):
            gross = 0

        department = str(row.get(dept_col, "General")) if dept_col else "General"

        # Calculate deductions (Spanish tax model as default)
        calculations = calculate_net(gross)

        employee_data = {
            "name": name,
            "department": department,
            "gross_salary": gross,
            "social_security": calculations["social_security"],
            "income_tax": calculations["income_tax"],
            "total_deductions": calculations["total_deductions"],
            "net_salary": calculations["net_salary"],
        }

        employees.append(employee_data)
        total_gross += gross
        total_net += calculations["net_salary"]
        total_tax += calculations["total_deductions"]

    # Step 4 — Generate payslip PDFs
    payslip_paths = []
    os.makedirs("payslips", exist_ok=True)
    for emp in employees:
        path = generate_payslip_pdf(emp)
        payslip_paths.append(path)

    return {
        "employees": employees,
        "summary": {
            "total_employees": len(employees),
            "total_gross_payroll": round(total_gross, 2),
            "total_net_payroll": round(total_net, 2),
            "total_deductions": round(total_tax, 2),
        },
        "payslip_paths": payslip_paths,
        "status": "complete"
    }


def calculate_net(gross: float) -> dict:
    """
    Calculates net salary from gross using Spanish tax model.
    Easily configurable for other countries.
    """
    # Spanish Social Security employee contribution — 6.35%
    social_security = round(gross * 0.0635, 2)

    # Simplified income tax (IRPF) brackets
    taxable = gross - social_security
    if taxable <= 12450:
        income_tax = round(taxable * 0.19, 2)
    elif taxable <= 20200:
        income_tax = round(2365.5 + (taxable - 12450) * 0.24, 2)
    elif taxable <= 35200:
        income_tax = round(4225.5 + (taxable - 20200) * 0.30, 2)
    elif taxable <= 60000:
        income_tax = round(8725.5 + (taxable - 35200) * 0.37, 2)
    else:
        income_tax = round(17901.5 + (taxable - 60000) * 0.45, 2)

    total_deductions = round(social_security + income_tax, 2)
    net_salary = round(gross - total_deductions, 2)

    return {
        "social_security": social_security,
        "income_tax": income_tax,
        "total_deductions": total_deductions,
        "net_salary": net_salary,
    }


def generate_payslip_pdf(employee: dict) -> str:
    """
    Generates a professional payslip PDF for one employee.
    Returns the file path.
    """
    filename = f"payslips/{employee['name'].replace(' ', '_')}_payslip.pdf"
    doc = SimpleDocTemplate(filename, pagesize=A4,
                            leftMargin=20*mm, rightMargin=20*mm,
                            topMargin=20*mm, bottomMargin=20*mm)

    styles = getSampleStyleSheet()
    INK = colors.HexColor("#1A1A1A")
    PURPLE = colors.HexColor("#534AB7")
    WHITE = colors.white

    title_style = ParagraphStyle("title", fontName="Helvetica-Bold",
                                  fontSize=20, textColor=PURPLE,
                                  alignment=TA_CENTER)
    sub_style = ParagraphStyle("sub", fontName="Helvetica",
                                fontSize=10, textColor=colors.HexColor("#6B6B6B"),
                                alignment=TA_CENTER)

    W = A4[0] - 40*mm
    story = []

    # Header
    story.append(Paragraph("Nexum", title_style))
    story.append(Paragraph("Payslip", sub_style))
    story.append(Spacer(1, 8*mm))

    # Employee info table
    info_data = [
        ["Employee", employee["name"]],
        ["Department", employee["department"]],
    ]
    info_table = Table(info_data, colWidths=[W*0.4, W*0.6])
    info_table.setStyle(TableStyle([
        ("FONTNAME",     (0,0), (-1,-1), "Helvetica"),
        ("FONTNAME",     (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTSIZE",     (0,0), (-1,-1), 10),
        ("TEXTCOLOR",    (0,0), (-1,-1), INK),
        ("BOTTOMPADDING",(0,0), (-1,-1), 6),
        ("TOPPADDING",   (0,0), (-1,-1), 6),
        ("LINEBELOW",    (0,0), (-1,-1), 0.3, colors.HexColor("#E0E0E0")),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 8*mm))

    # Earnings and deductions table
    pay_data = [
        ["Description", "Amount"],
        ["Gross Salary", f"€{employee['gross_salary']:,.2f}"],
        ["", ""],
        ["DEDUCTIONS", ""],
        ["Social Security (6.35%)", f"-€{employee['social_security']:,.2f}"],
        ["Income Tax (IRPF)", f"-€{employee['income_tax']:,.2f}"],
        ["Total Deductions", f"-€{employee['total_deductions']:,.2f}"],
        ["", ""],
        ["NET SALARY", f"€{employee['net_salary']:,.2f}"],
    ]

    pay_table = Table(pay_data, colWidths=[W*0.6, W*0.4])
    pay_table.setStyle(TableStyle([
        # Header row
        ("BACKGROUND",   (0,0), (-1,0), PURPLE),
        ("TEXTCOLOR",    (0,0), (-1,0), WHITE),
        ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",     (0,0), (-1,-1), 10),
        ("FONTNAME",     (0,1), (-1,-1), "Helvetica"),
        ("TEXTCOLOR",    (0,1), (-1,-1), INK),
        ("TOPPADDING",   (0,0), (-1,-1), 7),
        ("BOTTOMPADDING",(0,0), (-1,-1), 7),
        ("LEFTPADDING",  (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("LINEBELOW",    (0,0), (-1,-2), 0.3, colors.HexColor("#E0E0E0")),
        # Deductions label
        ("FONTNAME",     (0,3), (0,3), "Helvetica-Bold"),
        ("TEXTCOLOR",    (0,3), (0,3), PURPLE),
        # Net salary row
        ("BACKGROUND",   (0,-1), (-1,-1), colors.HexColor("#EEEDFE")),
        ("FONTNAME",     (0,-1), (-1,-1), "Helvetica-Bold"),
        ("TEXTCOLOR",    (0,-1), (-1,-1), PURPLE),
    ]))
    story.append(pay_table)
    story.append(Spacer(1, 8*mm))

    # Footer
    footer_style = ParagraphStyle("footer", fontName="Helvetica",
                                   fontSize=8,
                                   textColor=colors.HexColor("#A0A0A0"),
                                   alignment=TA_CENTER)
    story.append(Paragraph("Generated automatically by Nexum · Confidential", footer_style))

    doc.build(story)
    return filename


def detect_column(df: pd.DataFrame, candidates: list) -> str | None:
    for col in df.columns:
        if col.lower() in candidates:
            return col
    return None