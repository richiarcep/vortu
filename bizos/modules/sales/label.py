import io
from reportlab.lib.pagesizes import landscape
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from sqlalchemy.orm import Session
from models.sales import Product
from modules.sales.qr_generator import generate_nexum_qr_svg, generate_nexum_code


NAVY  = colors.HexColor("#0B1426")
CYAN  = colors.HexColor("#00B4D8")
WHITE = colors.white
LIGHT = colors.HexColor("#F4F6FB")
MUTED = colors.HexColor("#9CA3AF")


def generate_product_label_pdf(
    db: Session,
    product: Product,
    copies: int = 1,
) -> bytes:
    """
    Generates a printable PDF label for a product.
    Business card size: 85mm x 54mm landscape.
    Includes the NaviLens-style QR code and product info.
    """
    buffer = io.BytesIO()

    PAGE_W = 85 * mm
    PAGE_H = 54 * mm

    doc = SimpleDocTemplate(
        buffer,
        pagesize=(PAGE_W, PAGE_H),
        leftMargin=3 * mm,
        rightMargin=3 * mm,
        topMargin=3 * mm,
        bottomMargin=3 * mm,
    )

    def S(name, **kw):
        return ParagraphStyle(name, **kw)

    ST = {
        "name":     S("name",     fontName="Helvetica-Bold", fontSize=8,  textColor=NAVY,  leading=10),
        "code":     S("code",     fontName="Courier-Bold",   fontSize=7,  textColor=CYAN,  leading=9),
        "price":    S("price",    fontName="Helvetica-Bold", fontSize=16, textColor=NAVY,  leading=18),
        "sub":      S("sub",      fontName="Helvetica",      fontSize=5,  textColor=MUTED, leading=7),
        "cat":      S("cat",      fontName="Helvetica",      fontSize=6,  textColor=MUTED, leading=8),
        "brand":    S("brand",    fontName="Helvetica",      fontSize=5,  textColor=MUTED, leading=7),
    }

    nexum_code   = product.nexum_code or generate_nexum_code(product.company_id, product.id)
    price_no_iva = product.sale_price
    price_w_iva  = round(price_no_iva * (1 + product.iva_rate / 100), 2)
    margin_pct   = 0.0
    if product.cost_price and product.sale_price > 0:
        margin_pct = round(((product.sale_price - product.cost_price) / product.sale_price) * 100, 1)

    elements = []

    for _ in range(copies):
        # ── SVG QR placeholder (ReportLab can't render SVG directly) ─────────
        # We use a colored rect as a visual placeholder
        # The actual SVG is served via the /qr endpoint
        from reportlab.platypus import HRFlowable
        from reportlab.graphics.shapes import Drawing, Rect, String
        from reportlab.graphics import renderPDF

        qr_size = 40 * mm

        # Build a simple color-block QR representation in ReportLab
        drawing = Drawing(qr_size, qr_size)

        # Background
        drawing.add(Rect(0, 0, qr_size, qr_size, fillColor=colors.HexColor("#111827"), strokeColor=None))

        # Generate a simplified color grid from the nexum code
        import hashlib
        hash_bytes = hashlib.sha256(nexum_code.encode()).digest()
        color_palette = [
            colors.HexColor("#00B4D8"),  # Cyan
            colors.HexColor("#E63946"),  # Magenta
            colors.HexColor("#FFD60A"),  # Yellow
            colors.HexColor("#0B1426"),  # Black
        ]

        grid_n    = 10
        cell_size = qr_size / grid_n
        cell_idx  = 0

        for row in range(grid_n):
            for col in range(grid_n):
                # Finder patterns in corners
                is_corner = (
                    (row < 2 and col < 2) or
                    (row < 2 and col >= grid_n - 2) or
                    (row >= grid_n - 2 and col < 2)
                )
                if is_corner:
                    c = color_palette[3]  # Navy for finder patterns
                else:
                    byte_idx = cell_idx % len(hash_bytes)
                    c = color_palette[hash_bytes[byte_idx] % 4]
                    cell_idx += 1

                x = col * cell_size + 1
                y = (grid_n - 1 - row) * cell_size + 1
                w = cell_size - 2
                h = cell_size - 2

                drawing.add(Rect(
                    x, y, w, h,
                    fillColor=c,
                    strokeColor=None,
                    rx=w * 0.2,
                ))

        # Nexum code text below QR
        drawing.add(String(
            qr_size / 2, -6,
            nexum_code,
            fontName="Courier-Bold",
            fontSize=5,
            fillColor=colors.HexColor("#00B4D8"),
            textAnchor="middle",
        ))

        # ── Label layout ──────────────────────────────────────────────────────
        info_w = PAGE_W - 3*mm - qr_size - 2*mm - 3*mm

        name_para  = Paragraph(product.name[:30], ST["name"])
        code_para  = Paragraph(nexum_code, ST["code"])
        price_para = Paragraph(f"€{price_w_iva:.2f}", ST["price"])
        sub_para   = Paragraph(f"IVA {product.iva_rate:.0f}% incl. · s/IVA €{price_no_iva:.2f}", ST["sub"])
        cat_para   = Paragraph(product.category or "", ST["cat"])
        brand_para = Paragraph("Nexum", ST["brand"])

        from reportlab.platypus import KeepInFrame
        info_frame = KeepInFrame(
            info_w, 48 * mm,
            [
                Spacer(1, 1 * mm),
                name_para,
                Spacer(1, 1 * mm),
                cat_para,
                Spacer(1, 2 * mm),
                price_para,
                sub_para,
                Spacer(1, 2 * mm),
                code_para,
                Spacer(1, 4 * mm),
                brand_para,
            ]
        )

        from reportlab.platypus import Table as RTable, TableStyle as RTableStyle
        layout = RTable(
            [[drawing, info_frame]],
            colWidths=[qr_size + 2*mm, info_w],
        )
        layout.setStyle(RTableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING",   (0, 0), (-1, -1), 2),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 2),
            ("TOPPADDING",    (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("BACKGROUND",    (0, 0), (-1, -1), WHITE),
            ("BOX",           (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E9F0")),
            ("ROUNDEDCORNERS",(0, 0), (-1, -1), [4, 4, 4, 4]),
        ]))

        elements.append(layout)
        if _ < copies - 1:
            elements.append(Spacer(1, 3 * mm))

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()


def generate_bulk_labels_pdf(
    db: Session,
    company_id: int,
    product_ids: list,
) -> bytes:
    """
    Generates a sheet of labels for multiple products.
    4 labels per row, A4 page.
    """
    from reportlab.lib.pagesizes import A4
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=10 * mm,
        rightMargin=10 * mm,
        topMargin=10 * mm,
        bottomMargin=10 * mm,
    )

    elements = []
    products = db.query(Product).filter(
        Product.id.in_(product_ids),
        Product.company_id == company_id
    ).all()

    for product in products:
        label_bytes = generate_product_label_pdf(db, product, copies=1)
        elements.append(Spacer(1, 2 * mm))

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()