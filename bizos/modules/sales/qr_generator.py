import hashlib
import math


# ── Nexum color palette (NaviLens-inspired CMYK) ─────────────────────────────
COLORS = {
    'C': '#00B4D8',  # Cyan
    'M': '#E63946',  # Magenta
    'Y': '#FFD60A',  # Yellow
    'K': '#0B1426',  # Black/Navy
    'W': '#FFFFFF',  # White (empty)
}

GRID_SIZE   = 14   # 14x14 grid
MODULE_SIZE = 24   # pixels per module in SVG
QUIET_ZONE  = 1    # quiet zone in modules


def _encode_data(data: str) -> list:
    """
    Encodes a string into a list of color symbols (C/M/Y/K)
    by converting the string to binary and mapping bits to colors.
    Each character pair of bits maps to one color:
    00 → C, 01 → M, 10 → Y, 11 → K
    """
    # Hash the data to get a consistent fixed-length bit string
    hash_bytes = hashlib.sha256(data.encode()).digest()

    bits = []
    for byte in hash_bytes:
        for i in range(7, -1, -1):
            bits.append((byte >> i) & 1)

    # Also encode the actual data
    data_bits = []
    for char in data:
        byte_val = ord(char) & 0xFF
        for i in range(7, -1, -1):
            data_bits.append((byte_val >> i) & 1)

    combined = data_bits + bits
    color_map = ['C', 'M', 'Y', 'K']
    colors = []
    for i in range(0, len(combined) - 1, 2):
        idx = (combined[i] << 1) | combined[i + 1]
        colors.append(color_map[idx])

    return colors


def _get_finder_pattern() -> list:
    """Returns a 3x3 finder pattern (top-left corner style)."""
    return [
        ['K', 'K', 'K'],
        ['K', 'W', 'K'],
        ['K', 'K', 'K'],
    ]


def _build_grid(data: str) -> list:
    """
    Builds a GRID_SIZE x GRID_SIZE color grid encoding the data.
    Places finder patterns in corners and fills the rest with data.
    """
    grid = [['W'] * GRID_SIZE for _ in range(GRID_SIZE)]

    # ── Finder patterns in 3 corners ─────────────────────────────────────────
    fp = _get_finder_pattern()
    positions = [(0, 0), (0, GRID_SIZE - 3), (GRID_SIZE - 3, 0)]
    for row_off, col_off in positions:
        for r in range(3):
            for c in range(3):
                grid[row_off + r][col_off + c] = fp[r][c]

    # ── Timing pattern (alternating K/C along row 3 and col 3) ───────────────
    for i in range(3, GRID_SIZE - 3):
        grid[3][i] = 'K' if i % 2 == 0 else 'C'
        grid[i][3] = 'K' if i % 2 == 0 else 'C'

    # ── Data region ───────────────────────────────────────────────────────────
    encoded = _encode_data(data)
    data_idx = 0
    for row in range(4, GRID_SIZE):
        for col in range(4, GRID_SIZE):
            # Skip bottom-right reserved area
            if row >= GRID_SIZE - 3 and col >= GRID_SIZE - 3:
                continue
            if data_idx < len(encoded):
                grid[row][col] = encoded[data_idx]
                data_idx += 1

    # ── Bottom-right alignment pattern ────────────────────────────────────────
    for r in range(GRID_SIZE - 3, GRID_SIZE):
        for c in range(GRID_SIZE - 3, GRID_SIZE):
            grid[r][c] = fp[r - (GRID_SIZE - 3)][c - (GRID_SIZE - 3)]

    return grid


def generate_nexum_qr_svg(
    nexum_code: str,
    product_name: str = "",
    size: int = 200,
) -> str:
    """
    Generates a NaviLens-style colorful pixel art SVG for a product.

    Args:
        nexum_code:   The unique Nexum product code (e.g. NX-00001)
        product_name: Product name shown below the code
        size:         Total SVG size in pixels

    Returns:
        SVG string ready to embed or save as .svg
    """
    grid = _build_grid(nexum_code)
    n = GRID_SIZE

    # Calculate module size to fit in the requested size with padding
    padding    = 12
    module_px  = (size - padding * 2) / n

    total_w = size
    total_h = size + (28 if product_name else 0)

    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_w}" height="{total_h}" viewBox="0 0 {total_w} {total_h}">',
        f'<rect width="{total_w}" height="{total_h}" fill="#0B1426" rx="12"/>',
        f'<rect x="8" y="8" width="{total_w - 16}" height="{size - 16}" fill="#111827" rx="8"/>',
    ]

    # ── Draw modules ──────────────────────────────────────────────────────────
    for row in range(n):
        for col in range(n):
            color_key = grid[row][col]
            if color_key == 'W':
                continue
            color = COLORS[color_key]
            x = padding + col * module_px
            y = padding + row * module_px
            w = module_px - 1  # small gap between modules
            h = module_px - 1

            # Rounded corners for aesthetic
            rx = max(w * 0.15, 1)
            svg_parts.append(
                f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" '
                f'fill="{color}" rx="{rx:.1f}"/>'
            )

    # ── Nexum code label below the grid ──────────────────────────────────────
    svg_parts.append(
        f'<text x="{total_w // 2}" y="{size + 4}" '
        f'text-anchor="middle" font-family="monospace" font-size="9" '
        f'font-weight="bold" fill="#00B4D8">{nexum_code}</text>'
    )

    if product_name:
        # Truncate long names
        display_name = product_name[:22] + '...' if len(product_name) > 22 else product_name
        svg_parts.append(
            f'<text x="{total_w // 2}" y="{size + 18}" '
            f'text-anchor="middle" font-family="sans-serif" font-size="9" '
            f'fill="#9CA3AF">{display_name}</text>'
        )

    # ── Nexum branding dot ────────────────────────────────────────────────────
    svg_parts.append(
        f'<circle cx="{total_w - 14}" cy="14" r="4" fill="#00B4D8" opacity="0.8"/>'
    )

    svg_parts.append('</svg>')
    return '\n'.join(svg_parts)


def generate_nexum_code(company_id: int, product_id: int) -> str:
    """
    Generates a unique Nexum product code.
    Format: NX-{company_id:03d}{product_id:05d}
    Example: NX-001-00042
    """
    return f"NX-{company_id:03d}-{product_id:05d}"


def generate_label_svg(
    nexum_code: str,
    product_name: str,
    sale_price: float,
    iva_rate: float,
    category: str = "",
) -> str:
    """
    Generates a printable product label SVG.
    Includes the NaviLens QR, product name, price, and IVA.
    Standard label size: 85mm x 54mm (business card size)
    """
    W, H = 340, 216   # 4x scale of 85x54mm

    qr_svg_inner = generate_nexum_qr_svg(nexum_code, size=160)
    # Extract inner content from qr svg (remove outer svg tags)
    qr_inner = qr_svg_inner.split('\n', 1)[1].rsplit('\n', 1)[0]

    price_incl = round(sale_price * (1 + iva_rate / 100), 2)

    label = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
        f'<rect width="{W}" height="{H}" fill="white" rx="10" stroke="#E5E9F0" stroke-width="2"/>',

        # Left — QR code
        f'<g transform="translate(8, 28)">',
        qr_inner,
        '</g>',

        # Right — product info
        f'<text x="188" y="36" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0B1426">{product_name[:20]}</text>',
    ]

    if category:
        label.append(f'<text x="188" y="54" font-family="sans-serif" font-size="10" fill="#9CA3AF">{category}</text>')

    label += [
        # Price
        f'<text x="188" y="100" font-family="sans-serif" font-size="28" font-weight="800" fill="#0B1426">€{price_incl:.2f}</text>',
        f'<text x="188" y="118" font-family="sans-serif" font-size="9" fill="#9CA3AF">IVA {iva_rate:.0f}% incluido · s/IVA €{sale_price:.2f}</text>',

        # Nexum code
        f'<text x="188" y="150" font-family="monospace" font-size="11" fill="#00B4D8" font-weight="bold">{nexum_code}</text>',

        # Nexum branding
        f'<text x="188" y="195" font-family="sans-serif" font-size="8" fill="#D1D5DB">Powered by Nexum</text>',

        '</svg>'
    ]

    return '\n'.join(label)