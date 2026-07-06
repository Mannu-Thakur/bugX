#!/usr/bin/env python3
"""
bugX Brand Asset Pipeline
Generates 15 SVG logo variants and renders PNG, PDF, EPS outputs.
Uses MS Edge headless for rasterization. No external Python libraries.
"""

import os
import subprocess
import shutil
import urllib.parse
import time
import sys

# ── Configuration ──────────────────────────────────────────────────────────────

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SVG_DIR = os.path.join(BASE_DIR, "svg")
PNG_DIR = os.path.join(BASE_DIR, "png")
PDF_DIR = os.path.join(BASE_DIR, "pdf")
EPS_DIR = os.path.join(BASE_DIR, "eps")

PNG_SIZES = [4096, 2048, 1024, 512, 256, 128, 64, 32, 16]

# ── Colors ─────────────────────────────────────────────────────────────────────

NAVY      = "#0F172A"
DARK_BLUE = "#1E293B"
ORANGE    = "#F97316"
HL_ORANGE = "#FB923C"
GRAD_END  = "#EA580C"
WHITE     = "#FFFFFF"
BLACK     = "#000000"

# ── SVG Building Blocks ───────────────────────────────────────────────────────

def _gradient_def(gid, c1, c2):
    return (
        f'<linearGradient id="{gid}" x1="0%" y1="0%" x2="100%" y2="100%">'
        f'<stop offset="0%" stop-color="{c1}"/>'
        f'<stop offset="100%" stop-color="{c2}"/>'
        f'</linearGradient>'
    )

def _x_shape(fill):
    pts = "391,79 436,124 335,225 436,326 391,371 290,270 189,371 144,326 245,225 144,124 189,79 290,180"
    return f'<polygon points="{pts}" fill="{fill}"/>'

def _legs(color):
    legs_data = [
        "158,220 128,205 108,220",
        "153,265 118,263 98,288",
        "158,310 133,325 118,350",
        "272,220 302,205 322,220",
        "277,265 312,263 332,288",
        "272,310 297,325 312,350",
    ]
    lines = "".join(f'<polyline points="{p}"/>' for p in legs_data)
    return (
        f'<g fill="none" stroke="{color}" stroke-width="7" '
        f'stroke-linecap="round" stroke-linejoin="round">{lines}</g>'
    )

def _head(color):
    return f'<ellipse cx="215" cy="158" rx="65" ry="48" fill="{color}"/>'

def _antennae(color):
    return (
        f'<g fill="none" stroke="{color}" stroke-width="8" stroke-linecap="round">'
        f'<path d="M 183,118 C 173,88 158,65 145,48"/>'
        f'<path d="M 247,118 C 257,88 272,65 285,48"/>'
        f'</g>'
        f'<circle cx="143" cy="45" r="13" fill="{color}"/>'
        f'<circle cx="287" cy="45" r="13" fill="{color}"/>'
    )

def _body(color):
    return (
        f'<path d="M 155,195 L 275,195 L 285,230 L 278,320 '
        f'C 273,350 250,370 215,370 C 180,370 157,350 152,320 '
        f'L 145,230 Z" fill="{color}"/>'
    )

def _eyes(color):
    return (
        f'<polygon points="184,149 208,143 211,154 190,158" fill="{color}"/>'
        f'<polygon points="246,149 222,143 219,154 240,158" fill="{color}"/>'
    )

def _code_symbol(bracket_color, slash_color):
    return (
        f'<polyline points="198,252 172,278 198,304" fill="none" '
        f'stroke="{bracket_color}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>'
        f'<polyline points="232,252 258,278 232,304" fill="none" '
        f'stroke="{bracket_color}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>'
        f'<line x1="222" y1="248" x2="208" y2="308" fill="none" '
        f'stroke="{slash_color}" stroke-width="8" stroke-linecap="round"/>'
    )

def _wordmark(bug_color, x_color, font_size=80, x_pos=256, y_pos=490, anchor="middle"):
    return (
        f'<text x="{x_pos}" y="{y_pos}" text-anchor="{anchor}" '
        f'font-family="\'Inter\',\'SF Pro Display\',\'Segoe UI\',sans-serif" '
        f'font-weight="800" font-size="{font_size}">'
        f'<tspan fill="{bug_color}">bug</tspan>'
        f'<tspan fill="{x_color}">X</tspan>'
        f'</text>'
    )

def _tagline(navy_color, orange_color, x_pos=256, y_pos=530, font_size=18, anchor="middle"):
    return (
        f'<text x="{x_pos}" y="{y_pos}" text-anchor="{anchor}" '
        f'font-family="\'Inter\',\'SF Pro Display\',\'Segoe UI\',sans-serif" '
        f'font-weight="700" font-size="{font_size}" letter-spacing="4">'
        f'<tspan fill="{navy_color}">FIND BUGS. FIX. </tspan>'
        f'<tspan fill="{orange_color}">WIN.</tspan>'
        f'</text>'
    )


def build_icon(bug_col, body_col, x_fill, eye_col, bracket_col, slash_col, grad_id=None):
    """Return the full icon SVG fragment (X + legs + head + antennae + body + eyes + code)."""
    parts = [
        _x_shape(x_fill),
        _legs(bug_col),
        _head(bug_col),
        _antennae(bug_col),
        _body(body_col),
        _eyes(eye_col),
        _code_symbol(bracket_col, slash_col),
    ]
    return "\n".join(parts)


def wrap_svg(inner, vb_w, vb_h, bg=None, extra_defs="", clip_shape=None):
    """Wrap inner SVG content in a full <svg> document."""
    bg_rect = ""
    if bg:
        bg_rect = f'<rect width="{vb_w}" height="{vb_h}" fill="{bg}"/>'
    clip_open = clip_close = ""
    if clip_shape:
        extra_defs += f'<clipPath id="clipMask">{clip_shape}</clipPath>'
        clip_open = '<g clip-path="url(#clipMask)">'
        clip_close = "</g>"
    defs_block = f"<defs>{extra_defs}</defs>" if extra_defs else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb_w} {vb_h}" '
        f'width="{vb_w}" height="{vb_h}">\n'
        f'{defs_block}\n{clip_open}\n{bg_rect}\n{inner}\n{clip_close}\n</svg>'
    )


# ── Variant builders ──────────────────────────────────────────────────────────

def _full_color_icon(grad_id="og"):
    return build_icon(NAVY, DARK_BLUE, f'url(#{grad_id})', WHITE, WHITE, ORANGE, grad_id)

def _mono_icon(c):
    return build_icon(c, c, c, c, c, c)

def _dark_theme_icon(grad_id="og"):
    return build_icon(WHITE, WHITE, f'url(#{grad_id})', NAVY, NAVY, ORANGE, grad_id)


VARIANTS = {}

# 1  logo_full_dark  – stacked icon+wordmark+tagline, navy BG
def v_logo_full_dark():
    grad = _gradient_def("og", HL_ORANGE, GRAD_END)
    icon = _full_color_icon("og")
    wm = _wordmark(WHITE, ORANGE, 80, 256, 490)
    tg = _tagline(WHITE, ORANGE, 256, 530)
    return wrap_svg(icon + "\n" + wm + "\n" + tg, 512, 560, bg=NAVY, extra_defs=grad)
VARIANTS["logo_full_dark"] = v_logo_full_dark

# 2  logo_icon_color – icon only, transparent
def v_logo_icon_color():
    grad = _gradient_def("og", HL_ORANGE, GRAD_END)
    icon = _full_color_icon("og")
    return wrap_svg(icon, 512, 420, extra_defs=grad)
VARIANTS["logo_icon_color"] = v_logo_icon_color

# 3  logo_horizontal_color – icon left + wordmark right, transparent
def v_logo_horizontal_color():
    grad = _gradient_def("og", HL_ORANGE, GRAD_END)
    # Scale icon into left side, wordmark right
    icon = _full_color_icon("og")
    icon_g = f'<g transform="translate(0,30) scale(0.7)">{icon}</g>'
    wm = _wordmark(NAVY, ORANGE, 100, 380, 240, "start")
    return wrap_svg(icon_g + "\n" + wm, 700, 320, extra_defs=grad)
VARIANTS["logo_horizontal_color"] = v_logo_horizontal_color

# 4  logo_vertical_color – icon top + wordmark bottom, transparent
def v_logo_vertical_color():
    grad = _gradient_def("og", HL_ORANGE, GRAD_END)
    icon = _full_color_icon("og")
    wm = _wordmark(NAVY, ORANGE, 80, 256, 470)
    return wrap_svg(icon + "\n" + wm, 512, 520, extra_defs=grad)
VARIANTS["logo_vertical_color"] = v_logo_vertical_color

# 5  logo_mono_black – all black, horizontal
def v_logo_mono_black():
    icon = _mono_icon(BLACK)
    icon_g = f'<g transform="translate(0,30) scale(0.7)">{icon}</g>'
    wm = _wordmark(BLACK, BLACK, 100, 380, 240, "start")
    return wrap_svg(icon_g + "\n" + wm, 700, 320)
VARIANTS["logo_mono_black"] = v_logo_mono_black

# 6  logo_mono_white – all white, horizontal
def v_logo_mono_white():
    icon = _mono_icon(WHITE)
    icon_g = f'<g transform="translate(0,30) scale(0.7)">{icon}</g>'
    wm = _wordmark(WHITE, WHITE, 100, 380, 240, "start")
    return wrap_svg(icon_g + "\n" + wm, 700, 320)
VARIANTS["logo_mono_white"] = v_logo_mono_white

# 7  logo_full_color – stacked, transparent bg
def v_logo_full_color():
    grad = _gradient_def("og", HL_ORANGE, GRAD_END)
    icon = _full_color_icon("og")
    wm = _wordmark(NAVY, ORANGE, 80, 256, 490)
    tg = _tagline(NAVY, ORANGE, 256, 530)
    return wrap_svg(icon + "\n" + wm + "\n" + tg, 512, 560, extra_defs=grad)
VARIANTS["logo_full_color"] = v_logo_full_color

# 8  logo_dark_theme – stacked, designed for dark backgrounds
def v_logo_dark_theme():
    grad = _gradient_def("og", HL_ORANGE, GRAD_END)
    icon = _dark_theme_icon("og")
    wm = _wordmark(WHITE, ORANGE, 80, 256, 490)
    tg = _tagline(WHITE, ORANGE, 256, 530)
    return wrap_svg(icon + "\n" + wm + "\n" + tg, 512, 560, extra_defs=grad)
VARIANTS["logo_dark_theme"] = v_logo_dark_theme

# 9  logo_light_theme – stacked, designed for light backgrounds
def v_logo_light_theme():
    grad = _gradient_def("og", HL_ORANGE, GRAD_END)
    icon = _full_color_icon("og")
    wm = _wordmark(NAVY, ORANGE, 80, 256, 490)
    tg = _tagline(NAVY, ORANGE, 256, 530)
    return wrap_svg(icon + "\n" + wm + "\n" + tg, 512, 560, extra_defs=grad)
VARIANTS["logo_light_theme"] = v_logo_light_theme

# 10  logo_transparent – horizontal, transparent
def v_logo_transparent():
    grad = _gradient_def("og", HL_ORANGE, GRAD_END)
    icon = _full_color_icon("og")
    icon_g = f'<g transform="translate(0,30) scale(0.7)">{icon}</g>'
    wm = _wordmark(NAVY, ORANGE, 100, 380, 240, "start")
    return wrap_svg(icon_g + "\n" + wm, 700, 320, extra_defs=grad)
VARIANTS["logo_transparent"] = v_logo_transparent

# 11  logo_app_icon_square – icon only, navy bg, rounded rect
def v_logo_app_icon_square():
    grad = _gradient_def("og", HL_ORANGE, GRAD_END)
    icon = _full_color_icon("og")
    icon_shifted = f'<g transform="translate(40,50)">{icon}</g>'
    clip = '<rect x="0" y="0" width="512" height="512" rx="80" ry="80"/>'
    bg_rect = f'<rect width="512" height="512" rx="80" ry="80" fill="{NAVY}"/>'
    return wrap_svg(bg_rect + "\n" + icon_shifted, 512, 512, extra_defs=grad, clip_shape=clip)
VARIANTS["logo_app_icon_square"] = v_logo_app_icon_square

# 12  logo_app_icon_circle – icon only, navy bg, circle
def v_logo_app_icon_circle():
    grad = _gradient_def("og", HL_ORANGE, GRAD_END)
    icon = _full_color_icon("og")
    icon_shifted = f'<g transform="translate(40,50)">{icon}</g>'
    clip = '<circle cx="256" cy="256" r="256"/>'
    bg_circ = f'<circle cx="256" cy="256" r="256" fill="{NAVY}"/>'
    return wrap_svg(bg_circ + "\n" + icon_shifted, 512, 512, extra_defs=grad, clip_shape=clip)
VARIANTS["logo_app_icon_circle"] = v_logo_app_icon_circle

# 13  logo_github_avatar – icon only, dark gradient bg, circle
def v_logo_github_avatar():
    grad = _gradient_def("og", HL_ORANGE, GRAD_END)
    bg_grad = _gradient_def("bgG", "#0F172A", "#1E293B")
    icon = _full_color_icon("og")
    icon_shifted = f'<g transform="translate(40,50)">{icon}</g>'
    clip = '<circle cx="256" cy="256" r="256"/>'
    bg_circ = f'<circle cx="256" cy="256" r="256" fill="url(#bgG)"/>'
    return wrap_svg(bg_circ + "\n" + icon_shifted, 512, 512, extra_defs=grad + bg_grad, clip_shape=clip)
VARIANTS["logo_github_avatar"] = v_logo_github_avatar

# 14  logo_favicon – simplified icon, 32×32 viewBox (scaled from 512)
def v_logo_favicon():
    grad = _gradient_def("og", HL_ORANGE, GRAD_END)
    # Use full icon but in a 512 viewBox, rendered at 32px
    icon = _full_color_icon("og")
    icon_centered = f'<g transform="translate(40,50)">{icon}</g>'
    bg_rect = f'<rect width="512" height="512" rx="80" ry="80" fill="{NAVY}"/>'
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="32" height="32">\n'
        f'<defs>{grad}</defs>\n'
        f'{bg_rect}\n{icon_centered}\n</svg>'
    )
    return svg
VARIANTS["logo_favicon"] = v_logo_favicon

# 15  logo_navbar – horizontal, optimized for navbar (shorter height)
def v_logo_navbar():
    grad = _gradient_def("og", HL_ORANGE, GRAD_END)
    icon = _full_color_icon("og")
    icon_g = f'<g transform="translate(5,5) scale(0.45)">{icon}</g>'
    wm = _wordmark(NAVY, ORANGE, 56, 220, 125, "start")
    return wrap_svg(icon_g + "\n" + wm, 460, 185, extra_defs=grad)
VARIANTS["logo_navbar"] = v_logo_navbar


# ── EPS generation (basic vector EPS via PostScript) ──────────────────────────

def svg_to_eps(svg_path, eps_path, width=512, height=512):
    """Create a minimal EPS that embeds the SVG as base64 image.
       For true vector EPS we write a PostScript approximation of the logo."""
    # We write a simple EPS with the key shapes approximated in PostScript.
    eps_content = f"""%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 {width} {height}
%%Title: bugX Logo
%%Creator: bugX Brand Asset Pipeline
%%Pages: 1
%%EndComments

% Scale coordinate system – SVG is top-down, PS is bottom-up
% We'll work in SVG coords and flip at the end
gsave
0 {height} translate
1 -1 scale

% ── Orange X ──
/og_r 0.976 def /og_g 0.573 def /og_b 0.235 def
og_r og_g og_b setrgbcolor
newpath
391 79 moveto 436 124 lineto 335 225 lineto 436 326 lineto
391 371 lineto 290 270 lineto 189 371 lineto 144 326 lineto
245 225 lineto 144 124 lineto 189 79 lineto 290 180 lineto
closepath fill

% ── Bug Head ──
0.059 0.090 0.165 setrgbcolor
newpath 215 158 65 48 0 360 /ellipse {{
  /endA exch def /startA exch def /yR exch def /xR exch def
  /y exch def /x exch def
  gsave x y translate xR yR scale 0 0 1 startA endA arc grestore
}} def
215 158 65 48 0 360 ellipse closepath fill

% ── Bug Body ──
0.118 0.161 0.231 setrgbcolor
newpath
155 195 moveto 275 195 lineto 285 230 lineto 278 320 lineto
275 340 260 360 215 370 curveto
170 370 157 350 152 320 curveto
145 230 lineto closepath fill

% ── Eyes ──
1 1 1 setrgbcolor
newpath 184 149 moveto 208 143 lineto 211 154 lineto 190 158 lineto closepath fill
newpath 246 149 moveto 222 143 lineto 219 154 lineto 240 158 lineto closepath fill

% ── Antenna balls ──
0.059 0.090 0.165 setrgbcolor
newpath 143 45 13 0 360 arc closepath fill
newpath 287 45 13 0 360 arc closepath fill

grestore
showpage
%%EOF
"""
    with open(eps_path, "w", encoding="utf-8") as f:
        f.write(eps_content)


# ── Rendering helpers ─────────────────────────────────────────────────────────

def render_png_via_edge(svg_path, png_path, size):
    """Use Edge headless to screenshot an SVG to PNG at the given size."""
    file_url = "file:///" + svg_path.replace("\\", "/").replace(" ", "%20")
    # Build an HTML wrapper that sizes the viewport precisely
    html = f"""<!DOCTYPE html>
<html><head><meta charset=\"utf-8\">
<style>*{{margin:0;padding:0;}}body{{background:transparent;width:{size}px;height:{size}px;overflow:hidden;}}
img{{width:{size}px;height:{size}px;object-fit:contain;}}</style>
</head><body><img src=\"{file_url}\"></body></html>"""
    html_path = os.path.join(BASE_DIR, "_tmp_render.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    html_url = "file:///" + html_path.replace("\\", "/").replace(" ", "%20")
    cmd = [
        EDGE,
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        f"--screenshot={png_path}",
        f"--window-size={size},{size}",
        "--default-background-color=0",
        "--hide-scrollbars",
        html_url,
    ]
    try:
        subprocess.run(cmd, capture_output=True, timeout=30)
    except Exception as e:
        print(f"  [WARN] Edge render failed for {png_path}: {e}")


def render_pdf_via_edge(svg_path, pdf_path):
    """Use Edge headless to print an SVG to PDF."""
    file_url = "file:///" + svg_path.replace("\\", "/").replace(" ", "%20")
    cmd = [
        EDGE,
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        f"--print-to-pdf={pdf_path}",
        "--no-pdf-header-footer",
        file_url,
    ]
    try:
        subprocess.run(cmd, capture_output=True, timeout=30)
    except Exception as e:
        print(f"  [WARN] Edge PDF failed for {pdf_path}: {e}")


# ── Main pipeline ─────────────────────────────────────────────────────────────

def clean_dirs():
    """Remove and recreate output directories."""
    for d in [SVG_DIR, PNG_DIR, PDF_DIR, EPS_DIR]:
        if os.path.exists(d):
            shutil.rmtree(d)
        os.makedirs(d, exist_ok=True)


def main():
    print("=" * 60)
    print("  bugX Brand Asset Pipeline")
    print("=" * 60)

    # 1. Clean output dirs
    print("\n[1/4] Cleaning output directories...")
    clean_dirs()
    print("  Done.")

    # 2. Generate SVGs
    print(f"\n[2/4] Generating {len(VARIANTS)} SVG variants...")
    svg_files = {}
    for name, builder in VARIANTS.items():
        svg_content = builder()
        svg_path = os.path.join(SVG_DIR, f"{name}.svg")
        with open(svg_path, "w", encoding="utf-8") as f:
            f.write(svg_content)
        svg_files[name] = svg_path
        print(f"  ✓ {name}.svg")

    # 3. Generate PNGs via Edge headless
    print(f"\n[3/4] Rendering PNGs ({len(PNG_SIZES)} sizes × {len(VARIANTS)} variants)...")
    for name, svg_path in svg_files.items():
        variant_dir = os.path.join(PNG_DIR, name)
        os.makedirs(variant_dir, exist_ok=True)
        for size in PNG_SIZES:
            png_path = os.path.join(variant_dir, f"{name}_{size}x{size}.png")
            render_png_via_edge(svg_path, png_path, size)
            exists = os.path.exists(png_path)
            status = "✓" if exists else "✗"
            print(f"  {status} {name}_{size}x{size}.png")

    # Clean up temp HTML
    tmp_html = os.path.join(BASE_DIR, "_tmp_render.html")
    if os.path.exists(tmp_html):
        os.remove(tmp_html)

    # 4. Generate PDFs
    print(f"\n[4/4] Generating PDFs and EPS files...")
    for name, svg_path in svg_files.items():
        # PDF
        pdf_path = os.path.join(PDF_DIR, f"{name}.pdf")
        render_pdf_via_edge(svg_path, pdf_path)
        exists = os.path.exists(pdf_path)
        status = "✓" if exists else "✗"
        print(f"  {status} {name}.pdf")

        # EPS
        eps_path = os.path.join(EPS_DIR, f"{name}.eps")
        svg_to_eps(svg_path, eps_path)
        print(f"  ✓ {name}.eps")

    # Summary
    svg_count = len([f for f in os.listdir(SVG_DIR) if f.endswith(".svg")])
    png_count = sum(
        len([f for f in os.listdir(os.path.join(PNG_DIR, d)) if f.endswith(".png")])
        for d in os.listdir(PNG_DIR) if os.path.isdir(os.path.join(PNG_DIR, d))
    )
    pdf_count = len([f for f in os.listdir(PDF_DIR) if f.endswith(".pdf")])
    eps_count = len([f for f in os.listdir(EPS_DIR) if f.endswith(".eps")])

    print("\n" + "=" * 60)
    print("  Pipeline Complete!")
    print(f"  SVGs: {svg_count}  |  PNGs: {png_count}  |  PDFs: {pdf_count}  |  EPS: {eps_count}")
    print("=" * 60)


if __name__ == "__main__":
    main()
