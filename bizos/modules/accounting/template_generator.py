import qrcode
import hashlib
import hmac
import json
import os
from datetime import date, datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle,
    Paragraph, Spacer, Image
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import Flowable
from io import BytesIO
from core.config import get_settings

settings = get_settings()

# ── Brand colors ──────────────────────────────────────────────────────────────
PURPLE      = colors.HexColor("#534AB7")
PURPLE_L    = colors.HexColor("#EEEDFE")
PURPLE_D    = colors.HexColor("#3D3490")
INK         = colors.HexColor("#1A1A1A")
MUTED       = colors.HexColor("#6B6B6B")
BORDER      = colors.HexColor("#E0E0E0")
WHITE       = colors.white
BG          = colors.HexColor("#F8F8F6")
SUCCESS     = colors.HexColor("#0F6E56")


# ── Custom flowable for colored background ────────────────────────────────────
class ColorBlock(Flowable):
    def __init__(self, width, height, fill_color, radius=4):
        super().__init__()
        self.width = width
        self.height = height
        self.fill_color = fill_color
        self.radius = radius

    def draw(self):
        self.canv.setFillColor(self.fill_color)
        self.canv.roundRect(
            0, 0, self.width, self.height,
            self.radius, fill=1, stroke=0
        )

    def wrap(self, *args):
        return self.width, self.height


# ── QR Code generator ─────────────────────────────────────────────────────────
def generate_qr_code(data: dict, secret_key: str) -> BytesIO:
    """
    Generates an encrypted QR code containing document metadata.
    The QR contains a signed payload so Claude can verify
    the document is authentic and unmodified.
    """
    # Create payload
    payload = json.dumps(data, separators=(",", ":"))

    # Sign with HMAC-SHA256
    signature = hmac.new(
        secret_key.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()[:16].upper()

    # Final QR content
    qr_content = f"NEXUM|{payload}|SIG:{signature}"

    # Generate QR
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=4,
        border=1,
    )
    qr.add_data(qr_content)
    qr.make(fit=True)

    img = qr.make_image(
        fill_color="#534AB7",
        back_color="white"
    )

    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


def generate_document_id(company_id: int, period: str) -> str:
    """
    Generates a unique document serial number.
    Format: NXM-COMPANYID-PERIOD-CHECKSUM
    """
    base = f"{company_id}-{period}"
    checksum = hashlib.md5(base.encode()).hexdigest()[:6].upper()
    return f"NXM-{company_id:04d}-{period}-{checksum}"


# ── Main template generator ───────────────────────────────────────────────────
def generate_daily_register_template(
    company_data: dict,
    period_start: date,
    period_end: date,
    logo_path: str = None
) -> str:
    """
    Generates a branded daily register PDF template for a company.
    The user prints this, fills it in by hand, then uploads it.
    Claude reads it automatically.

    company_data = {
        "id": 1,
        "name": "Empresa S.L.",
        "nif": "B12345678",
        "address": "Calle Mayor 1, Madrid",
        "email": "info@empresa.com",
        "primary_color": "#534AB7"  # optional
    }
    """
    os.makedirs("templates", exist_ok=True)
    period_str = f"{period_start.strftime('%Y%m')}"
    doc_id = generate_document_id(company_data["id"], period_str)

    filename = f"templates/registro_diario_{company_data['id']}_{period_str}.pdf"

    W, H = A4
    MARGIN = 15 * mm
    CONTENT_W = W - 2 * MARGIN

    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=15 * mm,
    )

    # ── Styles ────────────────────────────────────────────────────────────────
    def S(name, **kw):
        return ParagraphStyle(name, **kw)

    styles = {
        "app_name":    S("an", fontName="Helvetica-Bold", fontSize=18,
                          textColor=PURPLE, alignment=TA_LEFT),
        "app_tag":     S("at", fontName="Helvetica", fontSize=8,
                          textColor=MUTED, alignment=TA_LEFT),
        "doc_title":   S("dt", fontName="Helvetica-Bold", fontSize=13,
                          textColor=WHITE, alignment=TA_CENTER),
        "doc_sub":     S("ds", fontName="Helvetica", fontSize=8,
                          textColor=colors.HexColor("#D0CFFF"),
                          alignment=TA_CENTER),
        "company_name":S("cn", fontName="Helvetica-Bold", fontSize=11,
                          textColor=INK),
        "company_info":S("ci", fontName="Helvetica", fontSize=8,
                          textColor=MUTED),
        "section":     S("sec", fontName="Helvetica-Bold", fontSize=8,
                          textColor=PURPLE, spaceBefore=6),
        "field_label": S("fl", fontName="Helvetica-Bold", fontSize=7,
                          textColor=MUTED),
        "instruction": S("ins", fontName="Helvetica", fontSize=7,
                          textColor=MUTED, alignment=TA_CENTER),
        "footer":      S("ft", fontName="Helvetica", fontSize=7,
                          textColor=MUTED, alignment=TA_CENTER),
        "doc_id":      S("di", fontName="Courier-Bold", fontSize=7,
                          textColor=PURPLE, alignment=TA_CENTER),
        "security":    S("sec2", fontName="Helvetica-Bold", fontSize=7,
                          textColor=SUCCESS),
    }

    story = []

    # ── HEADER ────────────────────────────────────────────────────────────────
    # Logo + App name + Document title in one header table
    period_label = (
        f"{period_start.strftime('%d/%m/%Y')} — {period_end.strftime('%d/%m/%Y')}"
    )

    # Left: logo or app name
    left_content = []
    if logo_path and os.path.exists(logo_path):
        left_content.append(Image(logo_path, width=30*mm, height=12*mm))
    else:
        left_content.append(Paragraph("Nexum", styles["app_name"]))
        left_content.append(Paragraph("Gestión Empresarial con IA", styles["app_tag"]))

    # Center: document title block
    title_data = [[Paragraph("REGISTRO DIARIO DE OPERACIONES", styles["doc_title"])],
                  [Paragraph(f"Período: {period_label}", styles["doc_sub"])]]
    title_table = Table(title_data, colWidths=[CONTENT_W * 0.5])
    title_table.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,-1), PURPLE),
        ("TOPPADDING",   (0,0), (-1,-1), 8),
        ("BOTTOMPADDING",(0,0), (-1,-1), 8),
        ("LEFTPADDING",  (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("ROUNDEDCORNERS",(0,0),(-1,-1),[6,6,6,6]),
    ]))

    header_table = Table(
        [[left_content, title_table]],
        colWidths=[CONTENT_W * 0.38, CONTENT_W * 0.62]
    )
    header_table.setStyle(TableStyle([
        ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING",  (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING",   (0,0), (-1,-1), 0),
        ("BOTTOMPADDING",(0,0), (-1,-1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4*mm))

    # ── COMPANY INFO + QR ─────────────────────────────────────────────────────
    # Generate QR
    qr_data = {
        "app": "nexum",
        "company_id": company_data["id"],
        "doc_id": doc_id,
        "period": period_str,
        "nif": company_data.get("nif", ""),
        "generated": datetime.now().isoformat()[:10]
    }
    qr_buffer = generate_qr_code(qr_data, settings.SECRET_KEY)
    qr_image = Image(qr_buffer, width=28*mm, height=28*mm)

    # Company info block
    company_info_data = [
        [Paragraph(company_data.get("name", ""), styles["company_name"]), ""],
        [Paragraph(f"NIF/CIF: {company_data.get('nif', '—')}", styles["company_info"]), ""],
        [Paragraph(company_data.get("address", ""), styles["company_info"]), ""],
        [Paragraph(company_data.get("email", ""), styles["company_info"]), ""],
    ]
    company_table = Table(company_info_data, colWidths=[CONTENT_W * 0.65, 0])
    company_table.setStyle(TableStyle([
        ("TOPPADDING",   (0,0), (-1,-1), 2),
        ("BOTTOMPADDING",(0,0), (-1,-1), 2),
        ("LEFTPADDING",  (0,0), (-1,-1), 0),
    ]))

    # Doc ID below company
    doc_id_para = Paragraph(f"ID: {doc_id}", styles["doc_id"])
    security_para = Paragraph(
        "✓ Documento verificado por Nexum", styles["security"]
    )

    info_qr_table = Table(
        [[company_table, qr_image]],
        colWidths=[CONTENT_W * 0.72, CONTENT_W * 0.28]
    )
    info_qr_table.setStyle(TableStyle([
        ("VALIGN",       (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING",  (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING",   (0,0), (-1,-1), 0),
        ("BOTTOMPADDING",(0,0), (-1,-1), 0),
        ("BOX",          (0,0), (-1,-1), 0.5, BORDER),
        ("BACKGROUND",   (0,0), (-1,-1), BG),
        ("LEFTPADDING",  (0,0), (0,-1),  8),
        ("TOPPADDING",   (0,0), (-1,-1), 6),
        ("BOTTOMPADDING",(0,0), (-1,-1), 6),
        ("RIGHTPADDING", (1,0), (1,-1),  6),
    ]))

    story.append(info_qr_table)
    story.append(Spacer(1, 2*mm))
    story.append(doc_id_para)
    story.append(security_para)
    story.append(Spacer(1, 4*mm))

    # ── INSTRUCTIONS ──────────────────────────────────────────────────────────
    instructions = [
        ["1. Complete una fila por cada transacción del día.",
         "2. Use I para Ingreso y G para Gasto en la columna Tipo.",
         "3. Escriba con letra clara y números legibles.",
         "4. Al finalizar, suba este documento a Nexum para procesamiento automático."]
    ]
    inst_table = Table(instructions, colWidths=[CONTENT_W])
    inst_table.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,-1), PURPLE_L),
        ("FONTNAME",     (0,0), (-1,-1), "Helvetica"),
        ("FONTSIZE",     (0,0), (-1,-1), 7),
        ("TEXTCOLOR",    (0,0), (-1,-1), PURPLE_D),
        ("TOPPADDING",   (0,0), (-1,-1), 6),
        ("BOTTOMPADDING",(0,0), (-1,-1), 6),
        ("LEFTPADDING",  (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("ROUNDEDCORNERS",(0,0),(-1,-1),[4,4,4,4]),
    ]))
    story.append(inst_table)
    story.append(Spacer(1, 4*mm))

    # ── TRANSACTION TABLE ─────────────────────────────────────────────────────
    # Header row
    headers = ["#", "Fecha\nDD/MM/AA", "Tipo\nI / G", "Categoría",
               "Descripción de la Operación", "Ingreso €", "Gasto €", "Notas"]
    col_widths = [
        CONTENT_W * 0.04,
        CONTENT_W * 0.10,
        CONTENT_W * 0.06,
        CONTENT_W * 0.13,
        CONTENT_W * 0.30,
        CONTENT_W * 0.12,
        CONTENT_W * 0.12,
        CONTENT_W * 0.13,
    ]

    # Create 25 empty rows for manual entry
    table_data = [headers]
    for i in range(1, 26):
        table_data.append([str(i), "", "", "", "", "", "", ""])

    # Totals row
    table_data.append(["", "", "", "", "TOTALES DEL PERÍODO", "", "", ""])

    transaction_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    transaction_table.setStyle(TableStyle([
        # Header
        ("BACKGROUND",    (0,0),  (-1,0),   PURPLE),
        ("TEXTCOLOR",     (0,0),  (-1,0),   WHITE),
        ("FONTNAME",      (0,0),  (-1,0),   "Helvetica-Bold"),
        ("FONTSIZE",      (0,0),  (-1,0),   7),
        ("ALIGN",         (0,0),  (-1,0),   "CENTER"),
        ("VALIGN",        (0,0),  (-1,0),   "MIDDLE"),
        ("TOPPADDING",    (0,0),  (-1,0),   5),
        ("BOTTOMPADDING", (0,0),  (-1,0),   5),

        # Data rows
        ("FONTNAME",      (0,1),  (-1,-2),  "Helvetica"),
        ("FONTSIZE",      (0,1),  (-1,-2),  7),
        ("TEXTCOLOR",     (0,1),  (-1,-2),  INK),
        ("ALIGN",         (0,1),  (2,-2),   "CENTER"),
        ("ALIGN",         (5,1),  (6,-2),   "RIGHT"),
        ("TOPPADDING",    (0,1),  (-1,-2),  5),
        ("BOTTOMPADDING", (0,1),  (-1,-2),  5),
        ("LEFTPADDING",   (0,0),  (-1,-1),  4),
        ("RIGHTPADDING",  (0,0),  (-1,-1),  4),

        # Alternating row colors
        ("ROWBACKGROUNDS",(0,1),  (-1,-2),  [WHITE, BG]),

        # Grid
        ("GRID",          (0,0),  (-1,-1),  0.3, BORDER),
        ("LINEBELOW",     (0,0),  (-1,0),   1,   PURPLE),

        # Row number column
        ("TEXTCOLOR",     (0,1),  (0,-2),   MUTED),

        # Totals row
        ("BACKGROUND",    (0,-1), (-1,-1),  PURPLE_L),
        ("FONTNAME",      (0,-1), (-1,-1),  "Helvetica-Bold"),
        ("FONTSIZE",      (0,-1), (-1,-1),  7),
        ("TEXTCOLOR",     (0,-1), (-1,-1),  PURPLE_D),
        ("ALIGN",         (4,-1), (4,-1),   "RIGHT"),
        ("TOPPADDING",    (0,-1), (-1,-1),  6),
        ("BOTTOMPADDING", (0,-1), (-1,-1),  6),
        ("LINEABOVE",     (0,-1), (-1,-1),  1, PURPLE),
    ]))
    story.append(transaction_table)
    story.append(Spacer(1, 4*mm))

    # ── CATEGORIES REFERENCE ──────────────────────────────────────────────────
    story.append(
        Paragraph("REFERENCIA DE CATEGORÍAS", styles["section"])
    )
    story.append(Spacer(1, 2*mm))

    cat_data = [
        ["INGRESOS (I)", "", "GASTOS (G)", ""],
        ["ventas", "Ingresos por Ventas",
         "nomina", "Nómina de Empleados"],
        ["servicios", "Ingresos por Servicios",
         "alquiler", "Alquiler"],
        ["otros_ingresos", "Otros Ingresos",
         "marketing", "Marketing y Publicidad"],
        ["intereses", "Ingresos por Intereses",
         "suministros", "Suministros de Oficina"],
        ["", "",
         "software", "Suscripciones de Software"],
        ["", "",
         "servicios_basicos", "Agua, Luz, Internet"],
        ["", "",
         "servicios_profesionales", "Asesoría, Consultoría"],
        ["", "",
         "impuestos", "Impuestos y Tasas"],
        ["", "",
         "otros_gastos", "Otros Gastos"],
    ]

    cat_table = Table(
        cat_data,
        colWidths=[
            CONTENT_W * 0.18,
            CONTENT_W * 0.30,
            CONTENT_W * 0.18,
            CONTENT_W * 0.34,
        ]
    )
    cat_table.setStyle(TableStyle([
        # Section headers
        ("BACKGROUND",    (0,0),  (1,0),   PURPLE),
        ("BACKGROUND",    (2,0),  (3,0),   PURPLE_D),
        ("TEXTCOLOR",     (0,0),  (-1,0),  WHITE),
        ("FONTNAME",      (0,0),  (-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0,0),  (-1,-1), 7),
        ("FONTNAME",      (0,1),  (-1,-1), "Helvetica"),
        ("TEXTCOLOR",     (0,1),  (-1,-1), INK),
        ("TEXTCOLOR",     (0,1),  (0,-1),  PURPLE),
        ("TEXTCOLOR",     (2,1),  (2,-1),  PURPLE_D),
        ("FONTNAME",      (0,1),  (0,-1),  "Courier"),
        ("FONTNAME",      (2,1),  (2,-1),  "Courier"),
        ("ROWBACKGROUNDS",(0,1),  (-1,-1), [WHITE, BG]),
        ("GRID",          (0,0),  (-1,-1), 0.3, BORDER),
        ("TOPPADDING",    (0,0),  (-1,-1), 4),
        ("BOTTOMPADDING", (0,0),  (-1,-1), 4),
        ("LEFTPADDING",   (0,0),  (-1,-1), 6),
        ("RIGHTPADDING",  (0,0),  (-1,-1), 6),
        ("LINEAFTER",     (1,0),  (1,-1),  1, PURPLE),
    ]))
    story.append(cat_table)
    story.append(Spacer(1, 4*mm))

    # ── SIGNATURE SECTION ─────────────────────────────────────────────────────
    sig_data = [[
        "Responsable: ________________________",
        "Firma: ________________________",
        f"Fecha de cierre: ___/___/______",
    ]]
    sig_table = Table(sig_data, colWidths=[CONTENT_W/3]*3)
    sig_table.setStyle(TableStyle([
        ("FONTNAME",     (0,0), (-1,-1), "Helvetica"),
        ("FONTSIZE",     (0,0), (-1,-1), 8),
        ("TEXTCOLOR",    (0,0), (-1,-1), MUTED),
        ("TOPPADDING",   (0,0), (-1,-1), 8),
        ("ALIGN",        (0,0), (-1,-1), "CENTER"),
        ("LINEABOVE",    (0,0), (-1,0),  0.5, BORDER),
    ]))
    story.append(sig_table)
    story.append(Spacer(1, 3*mm))

    # ── FOOTER ────────────────────────────────────────────────────────────────
    footer_data = [[
        Paragraph(
            f"Generado por Nexum · {datetime.now().strftime('%d/%m/%Y %H:%M')}",
            styles["footer"]
        ),
        Paragraph(f"ID: {doc_id}", styles["doc_id"]),
        Paragraph(
            "Suba este documento en nexum.app/registro para procesamiento automático",
            styles["footer"]
        ),
    ]]
    footer_table = Table(footer_data, colWidths=[CONTENT_W/3]*3)
    footer_table.setStyle(TableStyle([
        ("TOPPADDING",   (0,0), (-1,-1), 6),
        ("BOTTOMPADDING",(0,0), (-1,-1), 0),
        ("LINEABOVE",    (0,0), (-1,0),  0.5, BORDER),
        ("ALIGN",        (0,0), (0,-1),  "LEFT"),
        ("ALIGN",        (1,0), (1,-1),  "CENTER"),
        ("ALIGN",        (2,0), (2,-1),  "RIGHT"),
    ]))
    story.append(footer_table)

    doc.build(story)
    return filename