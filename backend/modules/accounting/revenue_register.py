from decimal import Decimal
from datetime import date, datetime
from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey, Text, Float, Boolean
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle,
    Paragraph, Spacer
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import Flowable
from io import BytesIO
import qrcode
import hashlib
import hmac
import json
import os
from core.database import Base
from core.config import get_settings

settings = get_settings()

# ── Colors ─────────────────────────────────────────────────────────────────────
PURPLE   = colors.HexColor("#534AB7")
PURPLE_L = colors.HexColor("#EEEDFE")
PURPLE_D = colors.HexColor("#3D3490")
TEAL     = colors.HexColor("#0F6E56")
TEAL_L   = colors.HexColor("#E1F5EE")
CORAL    = colors.HexColor("#993C1D")
CORAL_L  = colors.HexColor("#FAECE7")
AMBER    = colors.HexColor("#854F0B")
AMBER_L  = colors.HexColor("#FAEEDA")
BLUE     = colors.HexColor("#185FA5")
BLUE_L   = colors.HexColor("#E6F1FB")
INK      = colors.HexColor("#1A1A1A")
MUTED    = colors.HexColor("#6B6B6B")
BORDER   = colors.HexColor("#E0E0E0")
WHITE    = colors.white
BG       = colors.HexColor("#F8F8F6")

# ── Business types ──────────────────────────────────────────────────────────────
TIPOS_NEGOCIO = {
    "restaurante": "Restaurante / Bar / Cafetería",
    "tienda":      "Tienda / Comercio",
    "servicios":   "Servicios Profesionales",
    "mixto":       "Negocio Mixto",
}

# ── IVA rates ───────────────────────────────────────────────────────────────────
TIPOS_IVA = {
    "superreducido": {"rate": 4,  "label": "Superreducido 4%"},
    "reducido":      {"rate": 10, "label": "Reducido 10%"},
    "general":       {"rate": 21, "label": "General 21%"},
    "exento":        {"rate": 0,  "label": "Exento 0%"},
}

# ── Payment methods ─────────────────────────────────────────────────────────────
METODOS_PAGO = [
    "Efectivo",
    "Tarjeta Crédito/Débito",
    "Bizum",
    "Transferencia",
    "Vale / Cheque",
]

# ── Account maps ────────────────────────────────────────────────────────────────
CATEGORIAS_INGRESO = {
    "ventas":          {"cuenta": "400", "nombre": "Ingresos por Ventas"},
    "servicios":       {"cuenta": "410", "nombre": "Ingresos por Servicios"},
    "otros_ingresos":  {"cuenta": "420", "nombre": "Otros Ingresos"},
    "intereses":       {"cuenta": "430", "nombre": "Ingresos por Intereses"},
}

CATEGORIAS_GASTO = {
    "nomina":                  {"cuenta": "500", "nombre": "Gasto de Nómina"},
    "seguridad_social":        {"cuenta": "510", "nombre": "Gasto Seguridad Social"},
    "alquiler":                {"cuenta": "520", "nombre": "Gasto de Alquiler"},
    "servicios_basicos":       {"cuenta": "530", "nombre": "Servicios Básicos"},
    "marketing":               {"cuenta": "540", "nombre": "Gasto de Marketing"},
    "suministros":             {"cuenta": "550", "nombre": "Suministros de Oficina"},
    "software":                {"cuenta": "560", "nombre": "Suscripciones de Software"},
    "servicios_profesionales": {"cuenta": "570", "nombre": "Servicios Profesionales"},
    "depreciacion":            {"cuenta": "580", "nombre": "Depreciación"},
    "impuestos":               {"cuenta": "595", "nombre": "Gasto de Impuestos"},
    "otros_gastos":            {"cuenta": "590", "nombre": "Otros Gastos"},
}

# ── Sales categories by type ────────────────────────────────────────────────────
CATEGORIAS_VENTA = {
    "restaurante": [
        "Comida / Platos",
        "Bebidas",
        "Postres",
        "Menú del Día",
        "Tapas",
        "Otros",
    ],
    "tienda": [
        "Categoría A",
        "Categoría B",
        "Categoría C",
        "Categoría D",
        "Otros",
    ],
    "servicios": [
        "Consultoría",
        "Asesoría",
        "Diseño / Desarrollo",
        "Formación",
        "Otros Servicios",
    ],
    "mixto": [
        "Ventas / Productos",
        "Servicios",
        "Comida / Bebidas",
        "Otros",
    ],
}


# ── QR Generator ────────────────────────────────────────────────────────────────
def generate_qr(data: dict) -> BytesIO:
    payload = json.dumps(data, separators=(",", ":"))
    signature = hmac.new(
        settings.SECRET_KEY.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()[:16].upper()
    qr_content = f"VELA-CAJA|{payload}|SIG:{signature}"
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=3,
        border=1,
    )
    qr.add_data(qr_content)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#534AB7", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def generate_doc_id(company_id: int, fecha: date) -> str:
    base = f"{company_id}-{fecha.strftime('%Y%m%d')}"
    checksum = hashlib.md5(base.encode()).hexdigest()[:6].upper()
    return f"NXM-{company_id:04d}-{fecha.strftime('%Y%m%d')}-{checksum}"


# ── Style helper ────────────────────────────────────────────────────────────────
def S(name, **kw):
    return ParagraphStyle(name, **kw)


def sec_hdr(label: str, cw: float, bg, fg=WHITE) -> Table:
    """Colored section header bar with label."""
    t = Table(
        [[Paragraph(label, S("sh", fontName="Helvetica-Bold",
                              fontSize=7, textColor=fg))]],
        colWidths=[cw]
    )
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,-1), bg),
        ("TOPPADDING",   (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
        ("LEFTPADDING",  (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
    ]))
    return t


def boxed_table(data: list, col_widths: list,
                header_bg, header_fg=WHITE,
                stripe_bg=None) -> Table:
    """
    Standard table with colored header row,
    alternating stripes, and full border box.
    Each section has its own color so the AI
    reader can identify sections accurately.
    """
    stripe = stripe_bg or BG
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        # Header row
        ("BACKGROUND",    (0,0),  (-1,0),  header_bg),
        ("TEXTCOLOR",     (0,0),  (-1,0),  header_fg),
        ("FONTNAME",      (0,0),  (-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0,0),  (-1,-1), 7),
        ("FONTNAME",      (0,1),  (-1,-1), "Helvetica"),
        ("TEXTCOLOR",     (0,1),  (-1,-1), INK),
        # Alternating rows
        ("ROWBACKGROUNDS",(0,1),  (-1,-1), [WHITE, stripe]),
        # Grid
        ("GRID",          (0,0),  (-1,-1), 0.3, BORDER),
        ("BOX",           (0,0),  (-1,-1), 1,   header_bg),
        # Padding
        ("TOPPADDING",    (0,0),  (-1,-1), 4),
        ("BOTTOMPADDING", (0,0),  (-1,-1), 4),
        ("LEFTPADDING",   (0,0),  (-1,-1), 4),
        ("RIGHTPADDING",  (0,0),  (-1,-1), 4),
        ("ALIGN",         (1,0),  (-1,-1), "CENTER"),
        ("VALIGN",        (0,0),  (-1,-1), "MIDDLE"),
    ]))
    return t


# ── MAIN GENERATOR ──────────────────────────────────────────────────────────────
def generate_cierre_caja(
    company_data: dict,
    fecha: date,
    tipo_negocio: str = "mixto",
    logo_path: str = None
) -> str:
    """
    Generates a clean 2-page daily cash closing PDF.
    Color-coded sections for accurate AI reading.
    """
    os.makedirs("templates", exist_ok=True)
    doc_id = generate_doc_id(company_data["id"], fecha)

    # Localize currency from the company country (tenant amounts only).
    from country.registry import get_country_info
    _ci = get_country_info(company_data.get("country", "es")) or {}
    sym = _ci.get("symbol", "€")
    currency = _ci.get("currency", "EUR")
    filename = (
        f"templates/cierre_{company_data['id']}"
        f"_{fecha.strftime('%Y%m%d')}.pdf"
    )

    W, H = A4
    MG = 12 * mm
    CW = W - 2 * MG

    doc = SimpleDocTemplate(
        filename, pagesize=A4,
        leftMargin=MG, rightMargin=MG,
        topMargin=MG, bottomMargin=10*mm,
    )

    story = []

    # ════════════════════════════════════════════════════════════════
    # PAGE 1
    # ════════════════════════════════════════════════════════════════

    # ── HEADER ──────────────────────────────────────────────────────
    qr_data = {
        "app": "vela", "tipo": "cierre_caja",
        "cid": company_data["id"], "doc": doc_id,
        "fecha": str(fecha), "negocio": tipo_negocio,
    }
    qr_buf = generate_qr(qr_data)
    from reportlab.platypus import Image
    qr_img = Image(qr_buf, width=20*mm, height=20*mm)

    hdr_left = [
        Paragraph("Vela", S("logo", fontName="Helvetica-Bold",
                               fontSize=14, textColor=PURPLE)),
        Paragraph(company_data.get("name", ""),
                   S("cn", fontName="Helvetica-Bold", fontSize=8,
                      textColor=INK)),
        Paragraph(
            f"NIF: {company_data.get('nif','—')}  ·  "
            f"{company_data.get('address','—')}",
            S("ca", fontName="Helvetica", fontSize=7, textColor=MUTED)
        ),
    ]

    hdr_center_data = [
        [Paragraph("CIERRE DE CAJA DIARIO",
                    S("ct", fontName="Helvetica-Bold", fontSize=11,
                       textColor=WHITE, alignment=TA_CENTER))],
        [Paragraph(
            f"{TIPOS_NEGOCIO.get(tipo_negocio)}  ·  "
            f"{fecha.strftime('%d/%m/%Y')}",
            S("cs", fontName="Helvetica", fontSize=7,
               textColor=colors.HexColor("#D0CFFF"),
               alignment=TA_CENTER)
        )],
        [Paragraph(f"ID: {doc_id}",
                    S("cd", fontName="Courier-Bold", fontSize=6,
                       textColor=colors.HexColor("#B0AFEE"),
                       alignment=TA_CENTER))],
    ]
    hdr_center = Table(hdr_center_data, colWidths=[CW * 0.55])
    hdr_center.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), PURPLE),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 8),
        ("ROUNDEDCORNERS",(0,0), (-1,-1), [5,5,5,5]),
    ]))

    hdr = Table(
        [[hdr_left, hdr_center, qr_img]],
        colWidths=[CW*0.25, CW*0.57, CW*0.18]
    )
    hdr.setStyle(TableStyle([
        ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING",  (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING",   (0,0), (-1,-1), 0),
        ("BOTTOMPADDING",(0,0), (-1,-1), 0),
    ]))
    story.append(hdr)
    story.append(Spacer(1, 2*mm))

    # Shift bar
    shift_data = [[
        Paragraph("Turno:",
                   S("tl", fontName="Helvetica-Bold",
                      fontSize=7, textColor=MUTED)),
        Paragraph("□ Mañana   □ Tarde   □ Noche   □ Completo",
                   S("tv", fontName="Helvetica", fontSize=7,
                      textColor=INK)),
        Paragraph("Cajero/a: _______________________",
                   S("tv2", fontName="Helvetica", fontSize=7,
                      textColor=INK)),
        Paragraph("Terminal nº: __________",
                   S("tv3", fontName="Helvetica", fontSize=7,
                      textColor=INK)),
    ]]
    shift = Table(shift_data,
                   colWidths=[CW*0.10, CW*0.33, CW*0.33, CW*0.24])
    shift.setStyle(TableStyle([
        ("BOX",          (0,0), (-1,-1), 0.5, PURPLE),
        ("BACKGROUND",   (0,0), (-1,-1), PURPLE_L),
        ("TOPPADDING",   (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
        ("LEFTPADDING",  (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
    ]))
    story.append(shift)
    story.append(Spacer(1, 3*mm))

    # ── SECTION A — VENTAS (TEAL) ────────────────────────────────────
    story.append(sec_hdr(
        "A  VENTAS POR DEPARTAMENTO", CW, TEAL
    ))
    story.append(Spacer(1, 1*mm))

    cats = CATEGORIAS_VENTA.get(tipo_negocio, CATEGORIAS_VENTA["mixto"])
    sales_data = [
        ["Departamento / Categoría", "Uds.", f"Subtotal {sym}",
         "% IVA", f"IVA {sym}", f"Total {sym}"]
    ]
    for cat in cats:
        sales_data.append([cat, "", "", "", "", ""])
    sales_data.append(["TOTAL VENTAS", "", "", "", "", ""])

    s_widths = [CW*0.34, CW*0.10, CW*0.14,
                CW*0.10, CW*0.14, CW*0.14]
    sales_tbl = boxed_table(
        sales_data, s_widths, TEAL, WHITE, TEAL_L
    )
    # Bold last row
    sales_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,-1), (-1,-1), TEAL_L),
        ("FONTNAME",     (0,-1), (-1,-1), "Helvetica-Bold"),
        ("TEXTCOLOR",    (0,-1), (-1,-1), TEAL),
        ("LINEABOVE",    (0,-1), (-1,-1), 1, TEAL),
    ]))
    story.append(sales_tbl)
    story.append(Spacer(1, 3*mm))

    # ── SECTION B — TICKETS & PROPINAS (TEAL) ────────────────────────
    # Two side by side boxes
    # Left: ticket range
    ticket_data = [
        ["B  CONTROL DE TICKETS"],
        ["Ticket inicial nº", "___________"],
        ["Ticket final nº", "___________"],
        ["Total tickets emitidos", "___________"],
        ["Tickets anulados", "___________"],
        [f"Ticket medio {sym}", "___________"],
    ]
    ticket_tbl = Table(ticket_data, colWidths=[CW*0.25, CW*0.20])
    ticket_tbl.setStyle(TableStyle([
        ("SPAN",         (0,0), (1,0)),
        ("BACKGROUND",   (0,0), (-1,0), TEAL),
        ("TEXTCOLOR",    (0,0), (-1,0), WHITE),
        ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTNAME",     (0,1), (-1,-1), "Helvetica"),
        ("FONTSIZE",     (0,0), (-1,-1), 7),
        ("TEXTCOLOR",    (0,1), (0,-1), TEAL),
        ("FONTNAME",     (0,1), (0,-1), "Helvetica-Bold"),
        ("TEXTCOLOR",    (1,1), (1,-1), INK),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, TEAL_L]),
        ("BOX",          (0,0), (-1,-1), 1, TEAL),
        ("GRID",         (0,0), (-1,-1), 0.3, BORDER),
        ("TOPPADDING",   (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
        ("LEFTPADDING",  (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("ALIGN",        (1,1), (1,-1), "CENTER"),
    ]))

    # Right: tips (restaurant/mixto) or empty (others)
    if tipo_negocio in ["restaurante", "mixto"]:
        tips_data = [
            ["C  PROPINAS"],
            [f"Propinas efectivo {sym}", "___________"],
            [f"Propinas tarjeta {sym}", "___________"],
            [f"Propinas Bizum {sym}", "___________"],
            [f"TOTAL PROPINAS {sym}", "___________"],
            ["Reparto: □ Igualitario  □ %  □ Solo camareros", ""],
        ]
        tips_tbl = Table(tips_data, colWidths=[CW*0.30, CW*0.20])
        tips_tbl.setStyle(TableStyle([
            ("SPAN",         (0,0), (1,0)),
            ("SPAN",         (0,5), (1,5)),
            ("BACKGROUND",   (0,0), (-1,0), TEAL),
            ("TEXTCOLOR",    (0,0), (-1,0), WHITE),
            ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTNAME",     (0,1), (-1,-1), "Helvetica"),
            ("FONTSIZE",     (0,0), (-1,-1), 7),
            ("TEXTCOLOR",    (0,1), (0,-1), TEAL),
            ("FONTNAME",     (0,1), (0,-1), "Helvetica-Bold"),
            ("FONTNAME",     (0,-2),(0,-2), "Helvetica-Bold"),
            ("TEXTCOLOR",    (0,-2),(0,-2), TEAL),
            ("TEXTCOLOR",    (1,1), (1,-1), INK),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, TEAL_L]),
            ("BOX",          (0,0), (-1,-1), 1, TEAL),
            ("GRID",         (0,0), (-1,-1), 0.3, BORDER),
            ("TOPPADDING",   (0,0), (-1,-1), 4),
            ("BOTTOMPADDING",(0,0), (-1,-1), 4),
            ("LEFTPADDING",  (0,0), (-1,-1), 6),
            ("RIGHTPADDING", (0,0), (-1,-1), 6),
            ("ALIGN",        (1,1), (1,-1), "CENTER"),
        ]))
    else:
        tips_data = [["C  OBSERVACIONES"], ["", ""], ["", ""], ["", ""], ["", ""], ["", ""]]
        tips_tbl = Table(tips_data, colWidths=[CW*0.30, CW*0.20])
        tips_tbl.setStyle(TableStyle([
            ("SPAN",         (0,0), (1,0)),
            ("BACKGROUND",   (0,0), (-1,0), TEAL),
            ("TEXTCOLOR",    (0,0), (-1,0), WHITE),
            ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",     (0,0), (-1,-1), 7),
            ("BOX",          (0,0), (-1,-1), 1, TEAL),
            ("GRID",         (0,0), (-1,-1), 0.3, BORDER),
            ("TOPPADDING",   (0,0), (-1,-1), 4),
            ("BOTTOMPADDING",(0,0), (-1,-1), 4),
            ("LEFTPADDING",  (0,0), (-1,-1), 6),
        ]))

    bc_row = Table(
        [[ticket_tbl, Spacer(4*mm, 1), tips_tbl]],
        colWidths=[CW*0.46, 4*mm, CW*0.51]
    )
    bc_row.setStyle(TableStyle([
        ("VALIGN",       (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING",  (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING",   (0,0), (-1,-1), 0),
        ("BOTTOMPADDING",(0,0), (-1,-1), 0),
    ]))
    story.append(bc_row)
    story.append(Spacer(1, 3*mm))

    # ── SECTION D — EXENCIONES & DESCUENTOS (AMBER) ──────────────────
    story.append(sec_hdr(
        "D  EXENCIONES, DESCUENTOS Y DEVOLUCIONES", CW, AMBER
    ))
    story.append(Spacer(1, 1*mm))

    exempt_data = [
        ["Concepto", "Nº Operaciones", f"Importe {sym}", "Motivo / Referencia"],
        ["Ventas exentas de IVA", "", "", ""],
        ["Descuentos aplicados", "", "", ""],
        ["Devoluciones / Reembolsos", "", "", ""],
        ["Invitaciones / Cortesías", "", "", ""],
        ["TOTAL DEDUCCIONES", "", "", ""],
    ]
    e_widths = [CW*0.34, CW*0.16, CW*0.16, CW*0.34]
    exempt_tbl = boxed_table(
        exempt_data, e_widths, AMBER, WHITE, AMBER_L
    )
    exempt_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,-1), (-1,-1), AMBER_L),
        ("FONTNAME",     (0,-1), (-1,-1), "Helvetica-Bold"),
        ("TEXTCOLOR",    (0,-1), (-1,-1), AMBER),
        ("LINEABOVE",    (0,-1), (-1,-1), 1, AMBER),
    ]))
    story.append(exempt_tbl)
    story.append(Spacer(1, 3*mm))

    # ── PAGE BREAK ────────────────────────────────────────────────────
    from reportlab.platypus import PageBreak
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════
    # PAGE 2
    # ════════════════════════════════════════════════════════════════

    # Mini header page 2
    p2_hdr_data = [[
        Paragraph("Vela — Cierre de Caja Diario (Página 2/2)",
                   S("p2h", fontName="Helvetica-Bold", fontSize=8,
                      textColor=PURPLE)),
        Paragraph(
            f"{company_data.get('name','')}  ·  "
            f"{fecha.strftime('%d/%m/%Y')}  ·  ID: {doc_id}",
            S("p2s", fontName="Helvetica", fontSize=7,
               textColor=MUTED, alignment=TA_RIGHT)
        ),
    ]]
    p2_hdr = Table(p2_hdr_data, colWidths=[CW*0.45, CW*0.55])
    p2_hdr.setStyle(TableStyle([
        ("TOPPADDING",   (0,0), (-1,-1), 3),
        ("BOTTOMPADDING",(0,0), (-1,-1), 3),
        ("LINEBELOW",    (0,0), (-1,0),  0.5, PURPLE),
        ("LEFTPADDING",  (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
    ]))
    story.append(p2_hdr)
    story.append(Spacer(1, 3*mm))

    # ── SECTION E — MÉTODOS DE PAGO (CORAL) ──────────────────────────
    story.append(sec_hdr(
        "E  MÉTODOS DE PAGO", CW, CORAL
    ))
    story.append(Spacer(1, 1*mm))

    pay_data = [
        ["Método", "Nº Operaciones", f"Importe Bruto {sym}",
         f"Comisión {sym}", f"Importe Neto {sym}"]
    ]
    for m in METODOS_PAGO:
        pay_data.append([m, "", "", "", ""])
    pay_data.append(["TOTAL COBRADO", "", "", "", ""])

    p_widths = [CW*0.28, CW*0.16, CW*0.19, CW*0.16, CW*0.19]
    pay_tbl = boxed_table(pay_data, p_widths, CORAL, WHITE, CORAL_L)
    pay_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,-1), (-1,-1), CORAL_L),
        ("FONTNAME",     (0,-1), (-1,-1), "Helvetica-Bold"),
        ("TEXTCOLOR",    (0,-1), (-1,-1), CORAL),
        ("LINEABOVE",    (0,-1), (-1,-1), 1, CORAL),
    ]))
    story.append(pay_tbl)
    story.append(Spacer(1, 3*mm))

    # ── SECTION F — IVA BREAKDOWN (BLUE) ─────────────────────────────
    story.append(sec_hdr(
        "F  DESGLOSE DE IVA", CW, BLUE
    ))
    story.append(Spacer(1, 1*mm))

    iva_data = [
        ["Tipo IVA", f"Base Imponible {sym}", "% IVA",
         f"Cuota IVA {sym}", f"Total {sym}"]
    ]
    for k, v in TIPOS_IVA.items():
        iva_data.append([v["label"], "", f"{v['rate']}%", "", ""])
    iva_data.append(["TOTALES", "", "", "", ""])

    i_widths = [CW*0.30, CW*0.18, CW*0.10, CW*0.18, CW*0.18]
    iva_tbl = boxed_table(iva_data, i_widths, BLUE, WHITE, BLUE_L)
    iva_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,-1), (-1,-1), BLUE_L),
        ("FONTNAME",     (0,-1), (-1,-1), "Helvetica-Bold"),
        ("TEXTCOLOR",    (0,-1), (-1,-1), BLUE),
        ("LINEABOVE",    (0,-1), (-1,-1), 1, BLUE),
    ]))
    story.append(iva_tbl)
    story.append(Spacer(1, 3*mm))

    # ── SECTION G — ARQUEO DE CAJA (AMBER) ───────────────────────────
    story.append(sec_hdr(
        "G  ARQUEO DE CAJA — EFECTIVO", CW, AMBER
    ))
    story.append(Spacer(1, 1*mm))

    # Denominations are EUR-specific; only print the labelled breakdown for EUR.
    if currency == "EUR":
        bills  = ["€500", "€200", "€100", "€50", "€20", "€10", "€5"]
        coins  = ["€2", "€1", "€0,50", "€0,20", "€0,10", "€0,05"]
    else:
        bills  = []
        coins  = []

    arq_data = [["Billete", "Cant.", f"Total {sym}",
                  "Moneda", "Cant.", f"Total {sym}"]]
    n_rows = max(len(bills), len(coins)) or 7
    for i in range(n_rows):
        b = bills[i] if i < len(bills) else ""
        c = coins[i] if i < len(coins) else ""
        arq_data.append([b, "", "", c, "", ""])
    arq_data.append(["TOTAL BILLETES", "", "",
                      "TOTAL MONEDAS", "", ""])

    a_widths = [CW*0.12, CW*0.10, CW*0.14,
                CW*0.12, CW*0.10, CW*0.14]
    arq_tbl = boxed_table(arq_data, a_widths, AMBER, WHITE, AMBER_L)
    arq_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,-1), (-1,-1), AMBER_L),
        ("FONTNAME",     (0,-1), (-1,-1), "Helvetica-Bold"),
        ("TEXTCOLOR",    (0,-1), (-1,-1), AMBER),
        ("LINEABOVE",    (0,-1), (-1,-1), 1, AMBER),
        ("LINEAFTER",    (2,0),  (2,-1),  1, AMBER),
    ]))

    # Cash totals beside arqueo
    cash_totals = [
        [f"Total Billetes {sym}", "____________"],
        [f"Total Monedas {sym}", "____________"],
        [f"TOTAL CONTADO {sym}", "____________"],
        [f"Fondo Inicial {sym}", "____________"],
        [f"Total Esperado {sym}", "____________"],
        [f"DIFERENCIA {sym}", "____________"],
    ]
    ct_tbl = Table(cash_totals,
                    colWidths=[CW*0.22, CW*0.16])
    ct_tbl.setStyle(TableStyle([
        ("FONTNAME",     (0,0), (-1,-1), "Helvetica"),
        ("FONTSIZE",     (0,0), (-1,-1), 7),
        ("FONTNAME",     (0,2), (0,2),   "Helvetica-Bold"),
        ("FONTNAME",     (0,5), (0,5),   "Helvetica-Bold"),
        ("TEXTCOLOR",    (0,0), (0,-1),  AMBER),
        ("TEXTCOLOR",    (1,0), (1,-1),  INK),
        ("BOX",          (0,0), (-1,-1), 1, AMBER),
        ("INNERGRID",    (0,0), (-1,-1), 0.3, BORDER),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [WHITE, AMBER_L]),
        ("TOPPADDING",   (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
        ("LEFTPADDING",  (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("BACKGROUND",   (0,2), (-1,2),  AMBER_L),
        ("BACKGROUND",   (0,5), (-1,5),  AMBER_L),
    ]))

    arq_row = Table(
        [[arq_tbl, Spacer(4*mm, 1), ct_tbl]],
        colWidths=[CW*0.62, 4*mm, CW*0.38]
    )
    arq_row.setStyle(TableStyle([
        ("VALIGN",       (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING",  (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING",   (0,0), (-1,-1), 0),
        ("BOTTOMPADDING",(0,0), (-1,-1), 0),
    ]))
    story.append(arq_row)
    story.append(Spacer(1, 3*mm))

    # ── SECTION H — RESUMEN DEL DÍA (PURPLE) ─────────────────────────
    story.append(sec_hdr(
        "H  RESUMEN DEL DÍA", CW, PURPLE
    ))
    story.append(Spacer(1, 1*mm))

    res_left = [
        [f"Total Ventas Brutas {sym}", "____________"],
        [f"(-) Descuentos {sym}", "____________"],
        [f"(-) Devoluciones {sym}", "____________"],
        [f"(=) Ventas Netas {sym}", "____________"],
        [f"(+) IVA Total {sym}", "____________"],
        [f"TOTAL FACTURADO {sym}", "____________"],
    ]
    res_right = [
        [f"Total Cobrado {sym}", "____________"],
        [f"Total Propinas {sym}", "____________"],
        [f"Diferencia Caja {sym}", "____________"],
        ["Nº Tickets", "____________"],
        [f"Ticket Medio {sym}", "____________"],
        ["Resultado del Día", "□ OK  □ Diferencia"],
    ]

    res_data = []
    for i in range(len(res_left)):
        res_data.append(res_left[i] + [""] + res_right[i])

    res_tbl = Table(
        res_data,
        colWidths=[CW*0.27, CW*0.16, CW*0.04,
                   CW*0.27, CW*0.22]
    )
    res_tbl.setStyle(TableStyle([
        ("FONTNAME",     (0,0), (-1,-1), "Helvetica"),
        ("FONTSIZE",     (0,0), (-1,-1), 7),
        ("FONTNAME",     (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME",     (3,0), (3,-1), "Helvetica-Bold"),
        ("TEXTCOLOR",    (0,0), (0,-1), PURPLE),
        ("TEXTCOLOR",    (3,0), (3,-1), PURPLE),
        ("TEXTCOLOR",    (1,0), (1,-1), INK),
        ("TEXTCOLOR",    (4,0), (4,-1), INK),
        ("FONTNAME",     (0,-1),(1,-1),  "Helvetica-Bold"),
        ("FONTNAME",     (3,-1),(4,-1),  "Helvetica-Bold"),
        ("ALIGN",        (1,0), (1,-1), "RIGHT"),
        ("ALIGN",        (4,0), (4,-1), "RIGHT"),
        ("TOPPADDING",   (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
        ("LEFTPADDING",  (0,0), (-1,-1), 4),
        ("RIGHTPADDING", (0,0), (-1,-1), 4),
        ("BOX",          (0,0), (1,-1),  1, PURPLE),
        ("BOX",          (3,0), (4,-1),  1, PURPLE),
        ("INNERGRID",    (0,0), (1,-1),  0.3, BORDER),
        ("INNERGRID",    (3,0), (4,-1),  0.3, BORDER),
        ("ROWBACKGROUNDS",(0,0),(1,-1),  [WHITE, PURPLE_L]),
        ("ROWBACKGROUNDS",(3,0),(4,-1),  [WHITE, PURPLE_L]),
        ("BACKGROUND",   (0,-1),(1,-1),  PURPLE_L),
        ("BACKGROUND",   (3,-1),(4,-1),  PURPLE_L),
    ]))
    story.append(res_tbl)
    story.append(Spacer(1, 3*mm))

    # ── SECTION I — CONSULTAS IA (PURPLE DARK) ────────────────────────
    story.append(sec_hdr(
        "I  CONSULTAS AL ASISTENTE IA — Vela responde al subir este documento",
        CW, PURPLE_D
    ))
    story.append(Spacer(1, 1*mm))

    q_data = [
        ["Nº", "Tu pregunta", "Respuesta de Vela IA"],
    ]
    for i in range(1, 5):
        q_data.append([str(i), "", ""])

    q_tbl = Table(q_data, colWidths=[CW*0.05, CW*0.42, CW*0.53])
    q_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),  (-1,0),  PURPLE_D),
        ("TEXTCOLOR",     (0,0),  (-1,0),  WHITE),
        ("FONTNAME",      (0,0),  (-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0,0),  (-1,-1), 7),
        ("FONTNAME",      (0,1),  (-1,-1), "Helvetica"),
        ("TEXTCOLOR",     (0,1),  (-1,-1), INK),
        ("BOX",           (0,0),  (-1,-1), 1, PURPLE_D),
        ("GRID",          (0,0),  (-1,-1), 0.3, BORDER),
        ("ROWBACKGROUNDS",(0,1),  (-1,-1), [WHITE, PURPLE_L]),
        ("TOPPADDING",    (0,0),  (-1,-1), 7),
        ("BOTTOMPADDING", (0,0),  (-1,-1), 7),
        ("LEFTPADDING",   (0,0),  (-1,-1), 4),
        ("RIGHTPADDING",  (0,0),  (-1,-1), 4),
        ("VALIGN",        (0,0),  (-1,-1), "TOP"),
        ("LINEAFTER",     (1,0),  (1,-1),  1, PURPLE_D),
    ]))
    story.append(q_tbl)
    story.append(Spacer(1, 3*mm))

    # ── SIGNATURES + FOOTER ───────────────────────────────────────────
    sig_data = [[
        "Cajero/a: _______________________",
        "Supervisor/a: _______________________",
        "Sello:",
    ]]
    sig = Table(sig_data, colWidths=[CW/3]*3)
    sig.setStyle(TableStyle([
        ("FONTNAME",     (0,0), (-1,-1), "Helvetica"),
        ("FONTSIZE",     (0,0), (-1,-1), 7),
        ("TEXTCOLOR",    (0,0), (-1,-1), MUTED),
        ("TOPPADDING",   (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0), (-1,-1), 5),
        ("ALIGN",        (0,0), (-1,-1), "CENTER"),
        ("LINEABOVE",    (0,0), (-1,0),  0.5, BORDER),
    ]))
    story.append(sig)
    story.append(Spacer(1, 2*mm))

    ft_data = [[
        Paragraph(
            f"Vela · Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')}",
            S("fl", fontName="Helvetica", fontSize=6,
               textColor=MUTED, alignment=TA_LEFT)
        ),
        Paragraph(f"ID: {doc_id}",
                   S("fc", fontName="Courier-Bold", fontSize=6,
                      textColor=PURPLE, alignment=TA_CENTER)),
        Paragraph(
            "Suba este documento en Vela para procesamiento IA automático",
            S("fr", fontName="Helvetica", fontSize=6,
               textColor=MUTED, alignment=TA_RIGHT)
        ),
    ]]
    ft = Table(ft_data, colWidths=[CW/3]*3)
    ft.setStyle(TableStyle([
        ("LINEABOVE",    (0,0), (-1,0),  0.5, BORDER),
        ("TOPPADDING",   (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 0),
        ("LEFTPADDING",  (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
    ]))
    story.append(ft)

    doc.build(story)
    return filename


# ── Compatibility functions ─────────────────────────────────────────────────────
# ── Country-aware account resolution (no hardcoded 3-digit codes) ─────────────
def _company_country(db, company_id):
    from models.user import Company
    c = db.query(Company).filter(Company.id == company_id).first()
    return (c.country if c and c.country else "es")


def _cash_account_code(db, company_id):
    """Find the company's cash/bank account by name (Caja/Banco/Efectivo)."""
    from modules.accounting.journal import Account
    from sqlalchemy import or_
    a = (db.query(Account)
           .filter(Account.company_id == company_id, Account.account_type == "asset")
           .filter(or_(Account.name.ilike("%caja%"),
                       Account.name.ilike("%banco%"),
                       Account.name.ilike("%efectivo%")))
           .order_by(Account.code).first())
    return a.code if a else None


def _vat_account_code(db, company_id, kind):
    """Localiza la cuenta de IVA de la empresa por nombre (PGC ES: 477 repercutido,
    472 soportado). kind = 'repercutido' | 'soportado'. None si no existe."""
    from modules.accounting.journal import Account
    word = "repercut" if kind == "repercutido" else "soport"
    a = (db.query(Account)
           .filter(Account.company_id == company_id)
           .filter(Account.name.ilike("%iva%"))
           .filter(Account.name.ilike(f"%{word}%"))
           .order_by(Account.code).first())
    return a.code if a else None


def _split_iva(monto, iva_rate):
    """Desglosa un importe CON IVA incluido en (base, cuota). base+cuota == monto."""
    base = round(monto / (1 + iva_rate / 100.0), 2)
    cuota = round(monto - base, 2)
    return base, cuota


def registrar_ingreso(db, company_id, fecha, categoria,
                       descripcion, monto,
                       referencia=None, notas=None, iva_rate=21.0):
    from modules.accounting.journal import record_transaction
    from country.registry import get_entry_accounts
    country = _company_country(db, company_id)
    # Cobro al contado (monto IVA incluido): DEBE caja/banco (total) ·
    # HABER ingresos (base) · HABER IVA repercutido (cuota).
    clientes_code, ingreso_code = get_entry_accounts(country, "ingreso", "Ventas")
    cash_code = _cash_account_code(db, company_id) or clientes_code
    iva_code = _vat_account_code(db, company_id, "repercutido") if (iva_rate and iva_rate > 0) else None

    if iva_code:
        base, cuota = _split_iva(monto, iva_rate)
        entries = [
            {"account_code": cash_code, "debit": monto, "credit": 0},
            {"account_code": ingreso_code, "debit": 0, "credit": base},
            {"account_code": iva_code, "debit": 0, "credit": cuota},
        ]
    else:
        entries = [
            {"account_code": cash_code, "debit": monto, "credit": 0},
            {"account_code": ingreso_code, "debit": 0, "credit": monto},
        ]
    asiento = record_transaction(
        db=db, company_id=company_id, date=fecha,
        description=descripcion, entries=entries,
        module_source="cierre_caja", reference=referencia
    )
    db.commit()
    return {
        "mensaje": "Ingreso registrado exitosamente",
        "fecha": str(fecha), "tipo": "ingreso",
        "categoria": categoria,
        "descripcion": descripcion, "monto": monto, "iva_rate": iva_rate,
        "asiento_contable": asiento["transaction_id"]
    }


def registrar_gasto(db, company_id, fecha, categoria,
                     descripcion, monto,
                     referencia=None, notas=None, iva_rate=21.0):
    from modules.accounting.journal import record_transaction
    from country.registry import get_entry_accounts
    country = _company_country(db, company_id)
    # Pago al contado (monto IVA incluido): DEBE gasto (base) ·
    # DEBE IVA soportado (cuota) · HABER caja/banco (total).
    gasto_code, acreedor_code = get_entry_accounts(country, "gasto", "Otro")
    cash_code = _cash_account_code(db, company_id) or acreedor_code
    iva_code = _vat_account_code(db, company_id, "soportado") if (iva_rate and iva_rate > 0) else None

    if iva_code:
        base, cuota = _split_iva(monto, iva_rate)
        entries = [
            {"account_code": gasto_code, "debit": base, "credit": 0},
            {"account_code": iva_code, "debit": cuota, "credit": 0},
            {"account_code": cash_code, "debit": 0, "credit": monto},
        ]
    else:
        entries = [
            {"account_code": gasto_code, "debit": monto, "credit": 0},
            {"account_code": cash_code, "debit": 0, "credit": monto},
        ]
    asiento = record_transaction(
        db=db, company_id=company_id, date=fecha,
        description=descripcion, entries=entries,
        module_source="cierre_caja", reference=referencia
    )
    db.commit()
    return {
        "mensaje": "Gasto registrado exitosamente",
        "fecha": str(fecha), "tipo": "gasto",
        "categoria": categoria,
        "descripcion": descripcion, "monto": monto, "iva_rate": iva_rate,
        "asiento_contable": asiento["transaction_id"]
    }


def get_registro_periodo(db, company_id, start_date, end_date):
    """Income/expense movements for a period, shaped for the Contabilidad
    "Registro del mes" panel: {resumen, ingresos[], gastos[]}.

    Reads the income/expense lines of the journal (income accounts carry the
    revenue on the credit side, expense accounts on the debit side)."""
    from modules.accounting.journal import JournalEntry, Account
    rows = (
        db.query(JournalEntry, Account)
        .join(Account, Account.id == JournalEntry.account_id)
        .filter(
            JournalEntry.company_id == company_id,
            JournalEntry.date >= start_date,
            JournalEntry.date <= end_date,
            Account.account_type.in_(["income", "expense"]),
        )
        .order_by(JournalEntry.date.desc())
        .limit(500)
        .all()
    )

    ingresos, gastos = [], []
    total_ing = total_gas = 0.0
    for je, acc in rows:
        if acc.account_type == "income":
            monto = float(je.credit or 0) - float(je.debit or 0)   # net revenue
            if monto == 0:
                continue
            total_ing += monto
            ingresos.append({"descripcion": je.description, "fecha": str(je.date),
                             "categoria": acc.name, "monto": round(monto, 2)})
        else:  # expense
            monto = float(je.debit or 0) - float(je.credit or 0)   # net cost
            if monto == 0:
                continue
            total_gas += monto
            gastos.append({"descripcion": je.description, "fecha": str(je.date),
                           "categoria": acc.name, "monto": round(monto, 2)})

    return {
        "periodo": {"inicio": str(start_date), "fin": str(end_date)},
        "resumen": {
            "total_ingresos": round(total_ing, 2),
            "total_gastos": round(total_gas, 2),
            "resultado_neto": round(total_ing - total_gas, 2),
        },
        "ingresos": ingresos,
        "gastos": gastos,
        "total_asientos": len(ingresos) + len(gastos),
    }


def get_categorias_disponibles():
    return {
        "categorias_ingreso": [
            {"clave": k, "nombre": v["nombre"]}
            for k, v in CATEGORIAS_INGRESO.items()
        ],
        "categorias_gasto": [
            {"clave": k, "nombre": v["nombre"]}
            for k, v in CATEGORIAS_GASTO.items()
        ]
    }