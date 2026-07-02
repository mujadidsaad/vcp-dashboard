"""Content for the Swing Trading Playbook PDF.

Every SECTIONS entry is a list of tuples that generate_playbook.py knows how
to render.  Item kinds:
  ("title",    text)
  ("subtitle", text)
  ("h1",       text)          large heading
  ("h2",       text)          smaller heading
  ("body",     text)          justified paragraph, ReportLab HTML allowed
  ("bullet",   text)          bullet paragraph
  ("note",     text)          italic muted note
  ("space",    px)            vertical spacer
  ("hr",)                     horizontal rule
  ("table",    rows)          rows = [[header, header], [k, v], ...]
  ("pbreak",)                 page break
"""

from playbook_sections import (
    cover, big_picture, screeners, workflow, checklist,
    risk_and_size, entry_rules, exit_rules, playbook_examples,
    market_regime, journaling, glossary,
)

SECTIONS = [
    cover(),
    big_picture(),
    screeners(),
    workflow(),
    checklist(),
    risk_and_size(),
    entry_rules(),
    exit_rules(),
    market_regime(),
    playbook_examples(),
    journaling(),
    glossary(),
]