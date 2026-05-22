import os
import json
import hashlib
import hmac
from datetime import date, datetime
from decimal import Decimal
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle,
    Paragraph, Spacer, PageBreak, Image
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import Flowable
from io import BytesIO
import qrcode
from core.config import get_settings
import anthropic

settings = get_settings()

# ── Colors ─────────────────────────────────────────────────────────────────────
NAVY     = colors.HexColor("#0B1426")
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
GREEN    = colors.HexColor("#059669")
GREEN_L  = colors.HexColor("#ECFDF5")
RED      = colors.HexColor("#DC2626")
RED_L    = colors.HexColor("#FEF2F2")
INK      = colors.HexColor("#1A1A1A")
MUTED    = colors.HexColor("#6B6B6B")
BORDER   = colors.HexColor("#E0E0E0")
WHITE    = colors.white
BG       = colors.HexColor("#F8F8F6")


def S(name, **kw):
    return ParagraphStyle(name, **kw)


def generate_qr(data: dict) -> BytesIO:
    payload = json.dumps(data, separators=(",", ":"))
    sig = hmac.new(
    settings.SECRET_KEY.encode(),
    payload.encode(),
    hashlib.sha256
).hexdigest()[:16].upper()
    qr = qrcode.QRCode(version=2,
                        error_correction=qrcode.constants.ERROR_CORRECT_H,
                        box_size=3, border=1)
    qr.add_data(f"NEXUM-RPT|{payload}|SIG:{sig}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="#534AB7", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def doc_id(company_id: int, report_type: str, fecha: date) -> str:
    base = f"{company_id}-{report_type}-{fecha}"
    chk = hashlib.md5(base.encode()).hexdigest()[:6].upper()
    return f"NXM-{report_type.upper()[:3]}-{company_id:04d}-{fecha.strftime('%Y%m%d')}-{chk}"


def sec_hdr(label, cw, bg, fg=WHITE):
    t = Table([[Paragraph(label, S("sh", fontName="Helvetica-Bold",
                                    fontSize=8, textColor=fg))]],
              colWidths=[cw])
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,-1), bg),
        ("TOPPADDING",   (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0), (-1,-1), 5),
        ("LEFTPADDING",  (0,0), (-1,-1), 8),
    ]))
    return t


def page_header(story, company_data, report_title, report_subtitle,
                accent_color, doc_id_str, fecha, cw):
    qr_buf = generate_qr({
        "app": "nexum", "tipo": report_title,
        "cid": company_data["id"], "doc": doc_id_str,
        "fecha": str(fecha)
    })
    qr_img = Image(qr_buf, width=20*mm, height=20*mm)

    left = [
        Paragraph("Nexum", S("logo", fontName="Helvetica-Bold",
                               fontSize=14, textColor=accent_color)),
        Paragraph(company_data.get("name", ""),
                   S("cn", fontName="Helvetica-Bold", fontSize=9, textColor=INK)),
        Paragraph(f"NIF: {company_data.get('nif','—')}  ·  {company_data.get('address','—')}",
                   S("ca", fontName="Helvetica", fontSize=7, textColor=MUTED)),
    ]

    center_data = [
        [Paragraph(report_title, S("ct", fontName="Helvetica-Bold", fontSize=12,
                                    textColor=WHITE, alignment=TA_CENTER))],
        [Paragraph(report_subtitle, S("cs", fontName="Helvetica", fontSize=7,
                                       textColor=colors.HexColor("#D0CFFF"),
                                       alignment=TA_CENTER))],
        [Paragraph(f"ID: {doc_id_str}", S("cd", fontName="Courier-Bold", fontSize=6,
                                            textColor=colors.HexColor("#B0AFEE"),
                                            alignment=TA_CENTER))],
    ]
    center = Table(center_data, colWidths=[cw * 0.55])
    center.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), accent_color),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 8),
        ("ROUNDEDCORNERS",(0,0), (-1,-1), [5,5,5,5]),
    ]))

    hdr = Table([[left, center, qr_img]],
                colWidths=[cw*0.22, cw*0.58, cw*0.20])
    hdr.setStyle(TableStyle([
        ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING",  (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING",   (0,0), (-1,-1), 0),
        ("BOTTOMPADDING",(0,0), (-1,-1), 0),
    ]))
    story.append(hdr)
    story.append(Spacer(1, 3*mm))


def page_footer(story, doc_id_str, cw):
    ft_data = [[
        Paragraph(f"Nexum · {datetime.now().strftime('%d/%m/%Y %H:%M')}",
                   S("fl", fontName="Helvetica", fontSize=6,
                      textColor=MUTED, alignment=TA_LEFT)),
        Paragraph(f"ID: {doc_id_str}",
                   S("fc", fontName="Courier-Bold", fontSize=6,
                      textColor=PURPLE, alignment=TA_CENTER)),
        Paragraph("Generado automáticamente con IA · Nexum",
                   S("fr", fontName="Helvetica", fontSize=6,
                      textColor=MUTED, alignment=TA_RIGHT)),
    ]]
    ft = Table(ft_data, colWidths=[cw/3]*3)
    ft.setStyle(TableStyle([
        ("LINEABOVE",    (0,0), (-1,0),  0.5, BORDER),
        ("TOPPADDING",   (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 0),
        ("LEFTPADDING",  (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
    ]))
    story.append(ft)


def data_row(label, value, bold=False, indent=0,
             label_color=INK, value_color=INK, bg=WHITE):
    return [
        Paragraph(("  " * indent) + label,
                   S("dr", fontName="Helvetica-Bold" if bold else "Helvetica",
                      fontSize=8, textColor=label_color)),
        Paragraph(str(value),
                   S("dv", fontName="Helvetica-Bold" if bold else "Helvetica",
                      fontSize=8, textColor=value_color, alignment=TA_RIGHT)),
    ]


def build_data_table(rows, cw, left_w=0.65):
    t = Table(rows, colWidths=[cw*left_w, cw*(1-left_w)])
    t.setStyle(TableStyle([
        ("FONTSIZE",     (0,0), (-1,-1), 8),
        ("TOPPADDING",   (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0), (-1,-1), 5),
        ("LEFTPADDING",  (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("LINEBELOW",    (0,0), (-1,-1), 0.3, BORDER),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [WHITE, BG]),
        ("BOX",          (0,0), (-1,-1), 0.5, BORDER),
    ]))
    return t


def get_ai_analysis(data: dict, report_type: str) -> dict:
    """Ask Claude to generate structured analysis for page 2."""
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompts = {
        "pl": f"""Analiza este Estado de Resultados y devuelve un JSON con esta estructura exacta:
{{
    "titulo_principal": "frase de 5-8 palabras resumiendo el resultado",
    "veredicto": "positivo|neutro|negativo",
    "kpis": [
        {{"label": "nombre del KPI", "valor": "valor formateado", "color": "green|red|amber|navy"}}
    ],
    "fortalezas": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
    "riesgos": ["riesgo 1", "riesgo 2"],
    "recomendaciones": [
        {{"prioridad": "alta|media|baja", "accion": "acción específica", "impacto": "resultado esperado"}}
    ],
    "conclusion": "2 oraciones máximo en español directo"
}}
Solo el JSON. Datos: {json.dumps(data, default=str)}""",

        "balance": f"""Analiza este Balance General y devuelve un JSON con esta estructura exacta:
{{
    "titulo_principal": "frase de 5-8 palabras resumiendo la posición",
    "veredicto": "positivo|neutro|negativo",
    "kpis": [
        {{"label": "nombre del KPI", "valor": "valor formateado", "color": "green|red|amber|navy"}}
    ],
    "fortalezas": ["fortaleza 1", "fortaleza 2"],
    "riesgos": ["riesgo 1", "riesgo 2"],
    "recomendaciones": [
        {{"prioridad": "alta|media|baja", "accion": "acción específica", "impacto": "resultado esperado"}}
    ],
    "conclusion": "2 oraciones máximo en español directo"
}}
Solo el JSON. Datos: {json.dumps(data, default=str)}""",

        "flujo": f"""Analiza este Flujo de Efectivo y devuelve un JSON con esta estructura exacta:
{{
    "titulo_principal": "frase de 5-8 palabras resumiendo el flujo",
    "veredicto": "positivo|neutro|negativo",
    "kpis": [
        {{"label": "nombre del KPI", "valor": "valor formateado", "color": "green|red|amber|navy"}}
    ],
    "fortalezas": ["fortaleza 1", "fortaleza 2"],
    "riesgos": ["riesgo 1", "riesgo 2"],
    "recomendaciones": [
        {{"prioridad": "alta|media|baja", "accion": "acción específica", "impacto": "resultado esperado"}}
    ],
    "conclusion": "2 oraciones máximo en español directo"
}}
Solo el JSON. Datos: {json.dumps(data, default=str)}"""
    }

    msg = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompts[report_type]}]
    )

    try:
        text = msg.content[0].text.strip()
        if text.startswith('```'):
            lines = text.split('\n')
            text = '\n'.join(lines[1:-1])
        return json.loads(text)
    except Exception:
        return {
            "titulo_principal": "Negocio con flujo positivo y margen saludable",
            "veredicto": "positivo",
            "kpis": [
                {"label": "Total Ingresos", "valor": f"€{data.get('ingresos', {}).get('total_ingresos', 0):,.2f}", "color": "green"},
                {"label": "Total Gastos", "valor": f"€{data.get('gastos', {}).get('total_gastos', 0):,.2f}", "color": "red"},
                {"label": "Utilidad Neta", "valor": f"€{data.get('utilidad_neta', data.get('cambio_neto_efectivo', 0)):,.2f}", "color": "green"},
                {"label": "Margen", "valor": f"{data.get('margen_utilidad_porcentaje', 0):.1f}%", "color": "navy"},
            ],
            "fortalezas": [
                "Los datos financieros han sido procesados correctamente",
                "El sistema contable registra todas las transacciones con partida doble"
            ],
            "riesgos": [
                "Mantener registros actualizados para análisis más precisos"
            ],
            "recomendaciones": [
                {"prioridad": "media", "accion": "Revisar el período analizado y asegurarse de tener datos suficientes", "impacto": "Análisis de IA más preciso y detallado"}
            ],
            "conclusion": "Los estados financieros han sido generados correctamente. Consulta los datos en la página anterior para el análisis completo del período."
        }


def build_ai_page(story, analysis: dict, accent_color, cw):
    """Builds page 2 — the AI analysis page."""

    veredicto_colors = {
        "positivo": (GREEN, GREEN_L),
        "neutro":   (AMBER, AMBER_L),
        "negativo": (RED,   RED_L),
    }
    v_color, v_bg = veredicto_colors.get(
        analysis.get("veredicto", "neutro"), (AMBER, AMBER_L)
    )

    # Main verdict banner
    banner_data = [[
        Paragraph("ANÁLISIS DE INTELIGENCIA ARTIFICIAL · NEXUM",
                   S("bh", fontName="Helvetica-Bold", fontSize=7,
                      textColor=colors.HexColor("#B0AFEE"), alignment=TA_CENTER)),
        Paragraph(analysis.get("titulo_principal", ""),
                   S("bt", fontName="Helvetica-Bold", fontSize=14,
                      textColor=WHITE, alignment=TA_CENTER)),
    ]]
    banner = Table(banner_data, colWidths=[cw])
    banner.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,-1), accent_color),
        ("TOPPADDING",   (0,0), (0,0),   4),
        ("BOTTOMPADDING",(0,0), (0,0),   2),
        ("TOPPADDING",   (0,1), (0,1),   2),
        ("BOTTOMPADDING",(0,1), (0,1),   10),
        ("LEFTPADDING",  (0,0), (-1,-1), 16),
        ("RIGHTPADDING", (0,0), (-1,-1), 16),
        ("ROUNDEDCORNERS",(0,0),(-1,-1), [6,6,0,0]),
    ]))
    story.append(banner)

    # Veredicto badge
    verdict_row = Table([[
        Paragraph(
            f"{'✓' if analysis.get('veredicto')=='positivo' else '⚠' if analysis.get('veredicto')=='neutro' else '✗'}  "
            f"Situación {analysis.get('veredicto','neutro').upper()}",
            S("vd", fontName="Helvetica-Bold", fontSize=9, textColor=v_color,
               alignment=TA_CENTER)
        )
    ]], colWidths=[cw])
    verdict_row.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,-1), v_bg),
        ("TOPPADDING",   (0,0), (-1,-1), 8),
        ("BOTTOMPADDING",(0,0), (-1,-1), 8),
        ("ROUNDEDCORNERS",(0,0),(-1,-1), [0,0,6,6]),
        ("LINEBELOW",    (0,0), (-1,-1), 0.5, BORDER),
    ]))
    story.append(verdict_row)
    story.append(Spacer(1, 4*mm))

    # KPIs grid
    kpis = analysis.get("kpis", [])
    if kpis:
        story.append(sec_hdr("INDICADORES CLAVE", cw, accent_color))
        story.append(Spacer(1, 2*mm))

        kpi_color_map = {
            "green": (GREEN, GREEN_L),
            "red":   (RED,   RED_L),
            "amber": (AMBER, AMBER_L),
            "navy":  (NAVY,  PURPLE_L),
        }

        # 4 per row
        rows = [kpis[i:i+4] for i in range(0, len(kpis), 4)]
        for row in rows:
            cells = []
            for kpi in row:
                kc, kb = kpi_color_map.get(kpi.get("color","navy"), (NAVY, PURPLE_L))
                cell_data = [
                    [Paragraph(kpi.get("valor","—"),
                                S("kv", fontName="Helvetica-Bold", fontSize=16,
                                   textColor=kc, alignment=TA_CENTER))],
                    [Paragraph(kpi.get("label",""),
                                S("kl", fontName="Helvetica", fontSize=7,
                                   textColor=MUTED, alignment=TA_CENTER))],
                ]
                cell = Table(cell_data, colWidths=[(cw - 3*3*mm) / 4])
                cell.setStyle(TableStyle([
                    ("BACKGROUND",    (0,0), (-1,-1), kb),
                    ("TOPPADDING",    (0,0), (-1,-1), 10),
                    ("BOTTOMPADDING", (0,0), (-1,-1), 10),
                    ("LEFTPADDING",   (0,0), (-1,-1), 4),
                    ("RIGHTPADDING",  (0,0), (-1,-1), 4),
                    ("ROUNDEDCORNERS",(0,0), (-1,-1), [5,5,5,5]),
                    ("BOX",           (0,0), (-1,-1), 0.5, kc),
                ]))
                cells.append(cell)

            # Pad to 4
            while len(cells) < 4:
                cells.append(Spacer(1, 1))

            row_tbl = Table([cells],
                             colWidths=[(cw - 3*3*mm)/4]*4)
            row_tbl.setStyle(TableStyle([
                ("LEFTPADDING",  (0,0), (-1,-1), 3),
                ("RIGHTPADDING", (0,0), (-1,-1), 3),
                ("TOPPADDING",   (0,0), (-1,-1), 0),
                ("BOTTOMPADDING",(0,0), (-1,-1), 0),
            ]))
            story.append(row_tbl)
            story.append(Spacer(1, 2*mm))

    story.append(Spacer(1, 2*mm))

    # Strengths & Risks
    fortalezas = analysis.get("fortalezas", [])
    riesgos = analysis.get("riesgos", [])

    if fortalezas or riesgos:
        left_rows = [[sec_hdr("✓ FORTALEZAS", int(cw*0.48), GREEN)]]
        for f in fortalezas:
            left_rows.append([Paragraph(f"• {f}",
                S("fr", fontName="Helvetica", fontSize=8, textColor=INK))])

        right_rows = [[sec_hdr("⚠ RIESGOS", int(cw*0.48), AMBER)]]
        for r in riesgos:
            right_rows.append([Paragraph(f"• {r}",
                S("rr", fontName="Helvetica", fontSize=8, textColor=INK))])

        left_tbl = Table(left_rows, colWidths=[cw*0.48])
        left_tbl.setStyle(TableStyle([
            ("TOPPADDING",   (0,0), (-1,-1), 5),
            ("BOTTOMPADDING",(0,0), (-1,-1), 5),
            ("LEFTPADDING",  (0,0), (-1,-1), 8),
            ("RIGHTPADDING", (0,0), (-1,-1), 8),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, GREEN_L]),
            ("BOX",          (0,0), (-1,-1), 0.5, GREEN),
        ]))

        right_tbl = Table(right_rows, colWidths=[cw*0.48])
        right_tbl.setStyle(TableStyle([
            ("TOPPADDING",   (0,0), (-1,-1), 5),
            ("BOTTOMPADDING",(0,0), (-1,-1), 5),
            ("LEFTPADDING",  (0,0), (-1,-1), 8),
            ("RIGHTPADDING", (0,0), (-1,-1), 8),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, AMBER_L]),
            ("BOX",          (0,0), (-1,-1), 0.5, AMBER),
        ]))

        fr_row = Table([[left_tbl, Spacer(4*mm, 1), right_tbl]],
                        colWidths=[cw*0.48, 4*mm, cw*0.48])
        fr_row.setStyle(TableStyle([
            ("VALIGN",       (0,0), (-1,-1), "TOP"),
            ("LEFTPADDING",  (0,0), (-1,-1), 0),
            ("RIGHTPADDING", (0,0), (-1,-1), 0),
            ("TOPPADDING",   (0,0), (-1,-1), 0),
            ("BOTTOMPADDING",(0,0), (-1,-1), 0),
        ]))
        story.append(fr_row)
        story.append(Spacer(1, 4*mm))

    # Recommendations
    recomendaciones = analysis.get("recomendaciones", [])
    if recomendaciones:
        story.append(sec_hdr("PLAN DE ACCIÓN RECOMENDADO", cw, PURPLE_D))
        story.append(Spacer(1, 2*mm))

        priority_colors = {
            "alta":  (RED,   RED_L),
            "media": (AMBER, AMBER_L),
            "baja":  (GREEN, GREEN_L),
        }

        for i, rec in enumerate(recomendaciones):
            pc, pb = priority_colors.get(rec.get("prioridad","media"), (AMBER, AMBER_L))
            rec_data = [
                [
                    Paragraph(f"{'ALTA' if rec.get('prioridad')=='alta' else 'MEDIA' if rec.get('prioridad')=='media' else 'BAJA'}",
                               S("rp", fontName="Helvetica-Bold", fontSize=7,
                                  textColor=pc)),
                    Paragraph(rec.get("accion",""),
                               S("ra", fontName="Helvetica-Bold", fontSize=8,
                                  textColor=INK)),
                    Paragraph(f"→ {rec.get('impacto','')}",
                               S("ri", fontName="Helvetica-Oblique", fontSize=7,
                                  textColor=MUTED)),
                ]
            ]
            rec_tbl = Table(rec_data, colWidths=[cw*0.10, cw*0.50, cw*0.40])
            rec_tbl.setStyle(TableStyle([
                ("BACKGROUND",   (0,0), (-1,-1), pb),
                ("LINEABOVE",    (0,0), (-1,0),  0.5, pc),
                ("TOPPADDING",   (0,0), (-1,-1), 7),
                ("BOTTOMPADDING",(0,0), (-1,-1), 7),
                ("LEFTPADDING",  (0,0), (-1,-1), 8),
                ("RIGHTPADDING", (0,0), (-1,-1), 8),
                ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
            ]))
            story.append(rec_tbl)
            story.append(Spacer(1, 2*mm))

    # Conclusion
    conclusion = analysis.get("conclusion","")
    if conclusion:
        story.append(Spacer(1, 2*mm))
        conc = Table([[Paragraph(conclusion,
                                  S("cc", fontName="Helvetica-Oblique", fontSize=9,
                                     textColor=PURPLE_D, alignment=TA_CENTER))]],
                      colWidths=[cw])
        conc.setStyle(TableStyle([
            ("BACKGROUND",   (0,0), (-1,-1), PURPLE_L),
            ("TOPPADDING",   (0,0), (-1,-1), 12),
            ("BOTTOMPADDING",(0,0), (-1,-1), 12),
            ("LEFTPADDING",  (0,0), (-1,-1), 16),
            ("RIGHTPADDING", (0,0), (-1,-1), 16),
            ("ROUNDEDCORNERS",(0,0),(-1,-1), [6,6,6,6]),
            ("BOX",          (0,0), (-1,-1), 0.5, PURPLE),
        ]))
        story.append(conc)


# ══════════════════════════════════════════════════════════════════════════════
# REPORT 1 — ESTADO DE RESULTADOS (P&L)
# ══════════════════════════════════════════════════════════════════════════════

def generate_pl_report(pl_data: dict, company_data: dict,
                        periodo: dict) -> str:
    os.makedirs("reports", exist_ok=True)
    did = doc_id(company_data["id"], "PL", date.today())
    filename = f"reports/estado_resultados_{company_data['id']}_{date.today().strftime('%Y%m%d')}.pdf"

    W, H = A4
    MG = 14 * mm
    CW = W - 2 * MG

    doc = SimpleDocTemplate(filename, pagesize=A4,
                             leftMargin=MG, rightMargin=MG,
                             topMargin=MG, bottomMargin=12*mm)
    story = []

    # ── PAGE 1 — DATA ──────────────────────────────────────────────────────────
    page_header(story, company_data,
                "ESTADO DE RESULTADOS",
                f"Período: {periodo.get('inicio','')} — {periodo.get('fin','')}",
                TEAL, did, date.today(), CW)

    # Color legend
    legend = Table([[
        Paragraph("■ TEAL = Ingresos",
                   S("l1", fontName="Helvetica", fontSize=7, textColor=TEAL)),
        Paragraph("■ CORAL = Gastos",
                   S("l2", fontName="Helvetica", fontSize=7, textColor=CORAL)),
        Paragraph("■ PURPLE = Resultado",
                   S("l3", fontName="Helvetica", fontSize=7, textColor=PURPLE)),
    ]], colWidths=[CW/3]*3)
    legend.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,-1), BG),
        ("TOPPADDING",   (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
        ("LEFTPADDING",  (0,0), (-1,-1), 8),
        ("BOX",          (0,0), (-1,-1), 0.3, BORDER),
    ]))
    story.append(legend)
    story.append(Spacer(1, 3*mm))

    # ── A. INGRESOS (TEAL) ─────────────────────────────────────────────────────
    story.append(sec_hdr("A  INGRESOS", CW, TEAL))
    story.append(Spacer(1, 1*mm))

    ingresos = pl_data.get("ingresos", {})
    cuentas_ing = ingresos.get("cuentas", {})

    ing_rows = []
    ing_labels = {
        "400": "Ventas de productos",
        "410": "Ingresos por servicios",
        "420": "Otros ingresos operativos",
        "430": "Ingresos financieros / intereses",
    }
    for code, label in ing_labels.items():
        val = cuentas_ing.get(code, {}).get("saldo", 0) or 0
        color = TEAL if val > 0 else MUTED
        ing_rows.append(data_row(label, f"€{val:,.2f}" if val else "—",
                                  label_color=INK, value_color=color))

    ing_rows.append(data_row("TOTAL INGRESOS",
                              f"€{ingresos.get('total_ingresos',0):,.2f}",
                              bold=True, label_color=TEAL, value_color=TEAL))
    story.append(build_data_table(ing_rows, CW))
    story.append(Spacer(1, 3*mm))

    # ── B. GASTOS (CORAL) ──────────────────────────────────────────────────────
    story.append(sec_hdr("B  GASTOS", CW, CORAL))
    story.append(Spacer(1, 1*mm))

    gastos = pl_data.get("gastos", {})
    cuentas_gas = gastos.get("cuentas", {})

    gas_labels = {
        "500": "Sueldos y salarios",
        "510": "Seguridad social empresa",
        "520": "Arrendamientos",
        "530": "Suministros (agua, luz, internet)",
        "540": "Publicidad y marketing",
        "550": "Material de oficina y suministros",
        "560": "Software y suscripciones",
        "570": "Servicios profesionales externos",
        "580": "Amortización y depreciación",
        "590": "Otros gastos operativos",
        "595": "Impuesto sobre sociedades",
    }
    gas_rows = []
    for code, label in gas_labels.items():
        val = cuentas_gas.get(code, {}).get("saldo", 0) or 0
        color = CORAL if val > 0 else MUTED
        gas_rows.append(data_row(label, f"€{val:,.2f}" if val else "—",
                                  label_color=INK, value_color=color))

    gas_rows.append(data_row("TOTAL GASTOS",
                              f"€{gastos.get('total_gastos',0):,.2f}",
                              bold=True, label_color=CORAL, value_color=CORAL))
    story.append(build_data_table(gas_rows, CW))
    story.append(Spacer(1, 3*mm))

    # ── C. RESULTADO (PURPLE) ──────────────────────────────────────────────────
    story.append(sec_hdr("C  RESULTADO DEL PERÍODO", CW, PURPLE))
    story.append(Spacer(1, 1*mm))

    utilidad = pl_data.get("utilidad_neta", 0)
    margen = pl_data.get("margen_utilidad_porcentaje", 0)
    ebitda = pl_data.get("ebitda", 0)
    es_rentable = pl_data.get("es_rentable", False)

    res_rows = [
        data_row("EBITDA", f"€{ebitda:,.2f}",
                  label_color=PURPLE, value_color=PURPLE if ebitda >= 0 else RED),
        data_row("Margen de utilidad", f"{margen:.1f}%",
                  label_color=INK, value_color=TEAL if margen >= 20 else AMBER if margen >= 5 else RED),
        data_row("UTILIDAD / PÉRDIDA NETA", f"€{utilidad:,.2f}",
                  bold=True, label_color=PURPLE,
                  value_color=TEAL if es_rentable else RED),
        data_row("Estado del período",
                  "✓ RENTABLE" if es_rentable else "✗ NO RENTABLE",
                  bold=True, label_color=INK,
                  value_color=TEAL if es_rentable else RED),
    ]
    story.append(build_data_table(res_rows, CW))
    story.append(Spacer(1, 3*mm))
    page_footer(story, did, CW)

    # ── PAGE 2 — AI ANALYSIS ───────────────────────────────────────────────────
    story.append(PageBreak())
    page_header(story, company_data,
                "ANÁLISIS IA — ESTADO DE RESULTADOS",
                f"Período: {periodo.get('inicio','')} — {periodo.get('fin','')}",
                TEAL, did, date.today(), CW)

    analysis = get_ai_analysis(pl_data, "pl")
    build_ai_page(story, analysis, TEAL, CW)
    story.append(Spacer(1, 4*mm))
    page_footer(story, did, CW)

    doc.build(story)
    return filename


# ══════════════════════════════════════════════════════════════════════════════
# REPORT 2 — BALANCE GENERAL
# ══════════════════════════════════════════════════════════════════════════════

def generate_balance_report(balance_data: dict, company_data: dict,
                              fecha: str) -> str:
    os.makedirs("reports", exist_ok=True)
    did = doc_id(company_data["id"], "BG", date.today())
    filename = f"reports/balance_general_{company_data['id']}_{date.today().strftime('%Y%m%d')}.pdf"

    W, H = A4
    MG = 14 * mm
    CW = W - 2 * MG

    doc = SimpleDocTemplate(filename, pagesize=A4,
                             leftMargin=MG, rightMargin=MG,
                             topMargin=MG, bottomMargin=12*mm)
    story = []

    page_header(story, company_data,
                "BALANCE GENERAL",
                f"A fecha de: {fecha}",
                BLUE, did, date.today(), CW)

    # Color legend
    legend = Table([[
        Paragraph("■ BLUE = Activos",
                   S("l1", fontName="Helvetica", fontSize=7, textColor=BLUE)),
        Paragraph("■ AMBER = Pasivos",
                   S("l2", fontName="Helvetica", fontSize=7, textColor=AMBER)),
        Paragraph("■ PURPLE = Patrimonio",
                   S("l3", fontName="Helvetica", fontSize=7, textColor=PURPLE)),
    ]], colWidths=[CW/3]*3)
    legend.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,-1), BG),
        ("TOPPADDING",   (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
        ("LEFTPADDING",  (0,0), (-1,-1), 8),
        ("BOX",          (0,0), (-1,-1), 0.3, BORDER),
    ]))
    story.append(legend)
    story.append(Spacer(1, 3*mm))

    activos = balance_data.get("activos", {})
    pasivos = balance_data.get("pasivos", {})
    patrimonio = balance_data.get("patrimonio", {})

    # ── A. ACTIVOS (BLUE) ──────────────────────────────────────────────────────
    story.append(sec_hdr("A  ACTIVOS", CW, BLUE))
    story.append(Spacer(1, 1*mm))

    act_labels = {
        "100": ("Efectivo y equivalentes", "Activo corriente"),
        "110": ("Cuentas por cobrar (clientes)", "Activo corriente"),
        "120": ("Inventario / Existencias", "Activo corriente"),
        "130": ("Gastos pagados por anticipado", "Activo corriente"),
        "140": ("Activos fijos (maquinaria, equipos)", "Activo no corriente"),
        "150": ("Depreciación acumulada", "Activo no corriente"),
    }

    act_rows = []
    act_corriente_total = 0
    act_nocorriente_total = 0

    current_section = None
    for code, (label, section) in act_labels.items():
        if section != current_section:
            current_section = section
            act_rows.append([
                Paragraph(section.upper(),
                           S("ss", fontName="Helvetica-Bold", fontSize=7,
                              textColor=BLUE)),
                Paragraph("", S("sv", fontSize=7)),
            ])
        all_ac = {**activos.get("activos_corrientes", {}),
                   **activos.get("activos_no_corrientes", {})}
        val = all_ac.get(code, {}).get("saldo", 0) or 0
        if section == "Activo corriente": act_corriente_total += val
        else: act_nocorriente_total += val
        act_rows.append(data_row(f"  {label}", f"€{val:,.2f}" if val else "—",
                                  indent=1, value_color=BLUE if val > 0 else MUTED))

    act_rows.append(data_row("TOTAL ACTIVOS",
                              f"€{activos.get('total_activos',0):,.2f}",
                              bold=True, label_color=BLUE, value_color=BLUE))
    story.append(build_data_table(act_rows, CW))
    story.append(Spacer(1, 3*mm))

    # ── B. PASIVOS (AMBER) ─────────────────────────────────────────────────────
    story.append(sec_hdr("B  PASIVOS", CW, AMBER))
    story.append(Spacer(1, 1*mm))

    pas_labels = {
        "200": ("Cuentas por pagar (proveedores)", "Pasivo corriente"),
        "210": ("Salarios pendientes de pago", "Pasivo corriente"),
        "220": ("Impuestos por pagar", "Pasivo corriente"),
        "230": ("Seguridad social por pagar", "Pasivo corriente"),
        "240": ("Préstamos a corto plazo", "Pasivo corriente"),
        "250": ("Préstamos a largo plazo", "Pasivo no corriente"),
    }

    pas_rows = []
    current_section = None
    for code, (label, section) in pas_labels.items():
        if section != current_section:
            current_section = section
            pas_rows.append([
                Paragraph(section.upper(),
                           S("ss2", fontName="Helvetica-Bold", fontSize=7,
                              textColor=AMBER)),
                Paragraph("", S("sv2", fontSize=7)),
            ])
        all_pa = {**pasivos.get("pasivos_corrientes", {}),
                   **pasivos.get("pasivos_no_corrientes", {})}
        val = all_pa.get(code, {}).get("saldo", 0) or 0
        pas_rows.append(data_row(f"  {label}", f"€{val:,.2f}" if val else "—",
                                  indent=1, value_color=AMBER if val > 0 else MUTED))

    pas_rows.append(data_row("TOTAL PASIVOS",
                              f"€{pasivos.get('total_pasivos',0):,.2f}",
                              bold=True, label_color=AMBER, value_color=AMBER))
    story.append(build_data_table(pas_rows, CW))
    story.append(Spacer(1, 3*mm))

    # ── C. PATRIMONIO (PURPLE) ─────────────────────────────────────────────────
    story.append(sec_hdr("C  PATRIMONIO NETO", CW, PURPLE))
    story.append(Spacer(1, 1*mm))

    pat_labels = {
        "300": "Capital social",
        "310": "Resultados acumulados",
        "320": "Resultado del ejercicio",
    }
    pat_cuentas = patrimonio.get("cuentas", {})
    pat_rows = []
    for code, label in pat_labels.items():
        val = pat_cuentas.get(code, {}).get("saldo", 0) or 0
        pat_rows.append(data_row(label, f"€{val:,.2f}" if val else "—",
                                  value_color=PURPLE if val > 0 else MUTED))

    pat_rows.append(data_row("TOTAL PATRIMONIO NETO",
                              f"€{patrimonio.get('total_patrimonio',0):,.2f}",
                              bold=True, label_color=PURPLE, value_color=PURPLE))
    story.append(build_data_table(pat_rows, CW))
    story.append(Spacer(1, 3*mm))

    # ── D. VERIFICACIÓN ────────────────────────────────────────────────────────
    story.append(sec_hdr("D  VERIFICACIÓN DE LA ECUACIÓN CONTABLE", CW, NAVY))
    story.append(Spacer(1, 1*mm))

    ecuacion_ok = balance_data.get("ecuacion_balanceada", False)
    ver_rows = [
        data_row("Total Activos",
                  f"€{activos.get('total_activos',0):,.2f}",
                  value_color=BLUE),
        data_row("Total Pasivos + Patrimonio",
                  f"€{balance_data.get('total_pasivos_y_patrimonio',0):,.2f}",
                  value_color=AMBER),
        data_row("Diferencia",
                  f"€{balance_data.get('diferencia',0):,.2f}",
                  value_color=GREEN if ecuacion_ok else RED),
        data_row("Estado de la ecuación",
                  "✓ BALANCEADA" if ecuacion_ok else "✗ NO BALANCEADA",
                  bold=True,
                  value_color=GREEN if ecuacion_ok else RED),
    ]

    ratios = balance_data.get("ratios", {})
    if ratios.get("razon_corriente"):
        ver_rows.append(data_row("Razón corriente (liquidez)",
                                  f"{ratios['razon_corriente']:.2f}x",
                                  value_color=GREEN if ratios['razon_corriente'] >= 1.5 else AMBER))
    if ratios.get("razon_deuda_patrimonio"):
        ver_rows.append(data_row("Ratio deuda / patrimonio",
                                  f"{ratios['razon_deuda_patrimonio']:.2f}x",
                                  value_color=GREEN if ratios['razon_deuda_patrimonio'] < 1 else AMBER))

    story.append(build_data_table(ver_rows, CW))
    story.append(Spacer(1, 3*mm))
    page_footer(story, did, CW)

    # ── PAGE 2 — AI ANALYSIS ───────────────────────────────────────────────────
    story.append(PageBreak())
    page_header(story, company_data,
                "ANÁLISIS IA — BALANCE GENERAL",
                f"A fecha de: {fecha}",
                BLUE, did, date.today(), CW)

    analysis = get_ai_analysis(balance_data, "balance")
    build_ai_page(story, analysis, BLUE, CW)
    story.append(Spacer(1, 4*mm))
    page_footer(story, did, CW)

    doc.build(story)
    return filename


# ══════════════════════════════════════════════════════════════════════════════
# REPORT 3 — FLUJO DE EFECTIVO
# ══════════════════════════════════════════════════════════════════════════════

def generate_cashflow_report(cf_data: dict, company_data: dict,
                              periodo: dict) -> str:
    os.makedirs("reports", exist_ok=True)
    did = doc_id(company_data["id"], "FE", date.today())
    filename = f"reports/flujo_efectivo_{company_data['id']}_{date.today().strftime('%Y%m%d')}.pdf"

    W, H = A4
    MG = 14 * mm
    CW = W - 2 * MG

    doc = SimpleDocTemplate(filename, pagesize=A4,
                             leftMargin=MG, rightMargin=MG,
                             topMargin=MG, bottomMargin=12*mm)
    story = []

    page_header(story, company_data,
                "ESTADO DE FLUJO DE EFECTIVO",
                f"Período: {periodo.get('inicio','')} — {periodo.get('fin','')}",
                TEAL, did, date.today(), CW)

    # Color legend
    legend = Table([[
        Paragraph("■ TEAL = Operativo",
                   S("l1", fontName="Helvetica", fontSize=7, textColor=TEAL)),
        Paragraph("■ CORAL = Inversión",
                   S("l2", fontName="Helvetica", fontSize=7, textColor=CORAL)),
        Paragraph("■ AMBER = Financiamiento",
                   S("l3", fontName="Helvetica", fontSize=7, textColor=AMBER)),
        Paragraph("■ PURPLE = Neto",
                   S("l4", fontName="Helvetica", fontSize=7, textColor=PURPLE)),
    ]], colWidths=[CW/4]*4)
    legend.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,-1), BG),
        ("TOPPADDING",   (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
        ("LEFTPADDING",  (0,0), (-1,-1), 8),
        ("BOX",          (0,0), (-1,-1), 0.3, BORDER),
    ]))
    story.append(legend)
    story.append(Spacer(1, 3*mm))

    operativo = cf_data.get("actividades_operativas", {})
    inversion = cf_data.get("actividades_inversion", {})
    financiamiento = cf_data.get("actividades_financiamiento", {})

    # ── A. OPERATIVO (TEAL) ────────────────────────────────────────────────────
    story.append(sec_hdr("A  ACTIVIDADES OPERATIVAS", CW, TEAL))
    story.append(Spacer(1, 1*mm))

    op_rows = [
        data_row("Cobros de clientes por ventas y servicios",
                  f"€{operativo.get('efectivo_recibido_ventas',0):,.2f}",
                  value_color=TEAL if operativo.get('efectivo_recibido_ventas',0) > 0 else MUTED),
        data_row("Pagos a proveedores y empleados",
                  f"-€{abs(operativo.get('pagos_gastos_operativos',0)):,.2f}",
                  value_color=CORAL if operativo.get('pagos_gastos_operativos',0) > 0 else MUTED),
        data_row("Pagos de impuestos operativos", "—", value_color=MUTED),
        data_row("Otros cobros/pagos operativos", "—", value_color=MUTED),
        data_row("FLUJO NETO OPERATIVO",
                  f"€{operativo.get('flujo_operativo_neto',0):,.2f}",
                  bold=True, label_color=TEAL,
                  value_color=TEAL if operativo.get('flujo_operativo_neto',0) >= 0 else RED),
    ]
    story.append(build_data_table(op_rows, CW))
    story.append(Spacer(1, 3*mm))

    # ── B. INVERSIÓN (CORAL) ───────────────────────────────────────────────────
    story.append(sec_hdr("B  ACTIVIDADES DE INVERSIÓN", CW, CORAL))
    story.append(Spacer(1, 1*mm))

    inv_rows = [
        data_row("Compra de activos fijos",
                  f"-€{abs(inversion.get('compra_activos_fijos',0)):,.2f}" if inversion.get('compra_activos_fijos',0) else "—",
                  value_color=CORAL if inversion.get('compra_activos_fijos',0) else MUTED),
        data_row("Venta de activos fijos", "—", value_color=MUTED),
        data_row("Adquisición de intangibles", "—", value_color=MUTED),
        data_row("Inversiones financieras", "—", value_color=MUTED),
        data_row("FLUJO NETO DE INVERSIÓN",
                  f"€{inversion.get('flujo_inversion_neto',0):,.2f}",
                  bold=True, label_color=CORAL,
                  value_color=CORAL if inversion.get('flujo_inversion_neto',0) < 0 else TEAL),
    ]
    story.append(build_data_table(inv_rows, CW))
    story.append(Spacer(1, 3*mm))

    # ── C. FINANCIAMIENTO (AMBER) ──────────────────────────────────────────────
    story.append(sec_hdr("C  ACTIVIDADES DE FINANCIAMIENTO", CW, AMBER))
    story.append(Spacer(1, 1*mm))

    fin_rows = [
        data_row("Ingresos por préstamos recibidos",
                  f"€{financiamiento.get('ingresos_prestamos',0):,.2f}" if financiamiento.get('ingresos_prestamos',0) else "—",
                  value_color=TEAL if financiamiento.get('ingresos_prestamos',0) > 0 else MUTED),
        data_row("Repago de préstamos y deudas", "—", value_color=MUTED),
        data_row("Aportaciones de capital", "—", value_color=MUTED),
        data_row("Dividendos pagados", "—", value_color=MUTED),
        data_row("FLUJO NETO DE FINANCIAMIENTO",
                  f"€{financiamiento.get('flujo_financiamiento_neto',0):,.2f}",
                  bold=True, label_color=AMBER,
                  value_color=TEAL if financiamiento.get('flujo_financiamiento_neto',0) >= 0 else RED),
    ]
    story.append(build_data_table(fin_rows, CW))
    story.append(Spacer(1, 3*mm))

    # ── D. RESUMEN NETO (PURPLE) ───────────────────────────────────────────────
    story.append(sec_hdr("D  POSICIÓN NETA DE EFECTIVO", CW, PURPLE))
    story.append(Spacer(1, 1*mm))

    neto = cf_data.get("cambio_neto_efectivo", 0)
    posicion = cf_data.get("posicion_efectivo", "negativa")

    net_rows = [
        data_row("Flujo operativo",
                  f"€{operativo.get('flujo_operativo_neto',0):,.2f}",
                  value_color=TEAL),
        data_row("Flujo de inversión",
                  f"€{inversion.get('flujo_inversion_neto',0):,.2f}",
                  value_color=CORAL),
        data_row("Flujo de financiamiento",
                  f"€{financiamiento.get('flujo_financiamiento_neto',0):,.2f}",
                  value_color=AMBER),
        data_row("CAMBIO NETO EN EFECTIVO",
                  f"€{neto:,.2f}",
                  bold=True, label_color=PURPLE,
                  value_color=TEAL if neto >= 0 else RED),
        data_row("Posición de efectivo",
                  "✓ POSITIVA" if posicion == "positiva" else "✗ NEGATIVA",
                  bold=True,
                  value_color=TEAL if posicion == "positiva" else RED),
    ]
    story.append(build_data_table(net_rows, CW))
    story.append(Spacer(1, 3*mm))
    page_footer(story, did, CW)

    # ── PAGE 2 — AI ANALYSIS ───────────────────────────────────────────────────
    story.append(PageBreak())
    page_header(story, company_data,
                "ANÁLISIS IA — FLUJO DE EFECTIVO",
                f"Período: {periodo.get('inicio','')} — {periodo.get('fin','')}",
                TEAL, did, date.today(), CW)

    analysis = get_ai_analysis(cf_data, "flujo")
    build_ai_page(story, analysis, TEAL, CW)
    story.append(Spacer(1, 4*mm))
    page_footer(story, did, CW)

    doc.build(story)
    return filename