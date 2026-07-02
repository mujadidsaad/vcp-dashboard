"""Generate 'Swing Trading Playbook' PDF from docs/playbook_content.py.

Run:   python3 docs/generate_playbook.py
Out:   docs/Swing_Trading_Playbook.pdf
Deps:  reportlab
"""
from __future__ import annotations
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
)

from playbook_content import SECTIONS  # noqa: E402  (sibling module)

HERE = Path(__file__).resolve().parent
OUT  = HERE / "Swing_Trading_Playbook.pdf"

TEXT  = colors.HexColor("#111827")
MUTED = colors.HexColor("#4b5563")
FAINT = colors.HexColor("#9ca3af")
BAR   = colors.HexColor("#e5e7eb")
BG    = colors.HexColor("#f9fafb")


def build_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("title", parent=base["Title"], fontName="Helvetica-Bold",
                                fontSize=22, leading=26, textColor=TEXT, spaceAfter=6),
        "subtitle": ParagraphStyle("subtitle", parent=base["Normal"], fontName="Helvetica",
                                   fontSize=11, leading=15, textColor=MUTED, spaceAfter=14),
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName="Helvetica-Bold",
                             fontSize=15, leading=19, textColor=TEXT, spaceBefore=14, spaceAfter=6),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName="Helvetica-Bold",
                             fontSize=12, leading=15, textColor=TEXT, spaceBefore=8, spaceAfter=3),
        "body": ParagraphStyle("body", parent=base["BodyText"], fontName="Helvetica",
                               fontSize=10.5, leading=15, textColor=TEXT,
                               alignment=TA_JUSTIFY, spaceAfter=6),
        "bullet": ParagraphStyle("bullet", parent=base["BodyText"], fontName="Helvetica",
                                 fontSize=10.5, leading=15, textColor=TEXT, leftIndent=14,
                                 bulletIndent=2, spaceAfter=2, alignment=TA_LEFT),
        "note": ParagraphStyle("note", parent=base["Italic"], fontName="Helvetica-Oblique",
                               fontSize=9.5, leading=13, textColor=MUTED, spaceAfter=6),
    }


def make_table(rows, col_widths=(5 * cm, 11 * cm)):
    tbl = Table(rows, colWidths=list(col_widths))
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BAR),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("LEADING", (0, 0), (-1, -1), 13),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("BOX", (0, 0), (-1, -1), 0.4, FAINT),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, BAR),
        ("BACKGROUND", (0, 1), (0, -1), BG),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
    ]))
    return tbl


def hrule():
    t = Table([[""]], colWidths=[16 * cm], rowHeights=[1])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), BAR)]))
    return t


def render(item, s):
    """Turn a content descriptor into a flowable."""
    kind = item[0]
    if kind == "title":    return Paragraph(item[1], s["title"])
    if kind == "subtitle": return Paragraph(item[1], s["subtitle"])
    if kind == "h1":       return Paragraph(item[1], s["h1"])
    if kind == "h2":       return Paragraph(item[1], s["h2"])
    if kind == "body":     return Paragraph(item[1], s["body"])
    if kind == "note":     return Paragraph(item[1], s["note"])
    if kind == "bullet":   return Paragraph("&bull; " + item[1], s["bullet"])
    if kind == "space":    return Spacer(1, item[1])
    if kind == "hr":       return hrule()
    if kind == "table":    return make_table(item[1], item[2] if len(item) > 2 else (5 * cm, 11 * cm))
    if kind == "pbreak":   return PageBreak()
    raise ValueError(f"unknown item kind: {kind}")


def main():
    styles = build_styles()
    doc = SimpleDocTemplate(
        str(OUT), pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=1.8 * cm, bottomMargin=1.8 * cm,
        title="Swing Trading Playbook", author="VCP+RVOL Dashboard",
    )
    story = []
    for section in SECTIONS:
        for item in section:
            story.append(render(item, styles))
    doc.build(story)
    print(f"[ok] wrote {OUT}  ({OUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(HERE))  # so `playbook_content` resolves
    main()
