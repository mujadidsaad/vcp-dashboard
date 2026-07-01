"""Load NSE index constituent lists and expose classified stock universes."""
from __future__ import annotations

import csv
from pathlib import Path
from typing import Dict, List

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
REPO_ROOT = BASE_DIR.parent
INDICES_DIR = REPO_ROOT / "data" / "indices"
ALL_STOCKS_CSV = REPO_ROOT / "data" / "data.csv"

# Display name -> CSV filename (in data/indices/)
INDEX_FILES: Dict[str, str] = {
    "Nifty 50":            "ind_nifty50list.csv",
    "Nifty 100":           "ind_nifty100list.csv",
    "Nifty 200":           "ind_nifty200list.csv",
    "Nifty 500":           "ind_nifty500list.csv",
    "Nifty Midcap 150":    "ind_niftymidcap150list.csv",
    "Nifty Smallcap 250":  "ind_niftysmallcap250list.csv",
    "Nifty Total Market":  "ind_niftytotalmarket_list.csv",
}


def _read_symbols(csv_path: Path) -> List[str]:
    if not csv_path.exists():
        return []
    out: List[str] = []
    with csv_path.open("r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sym = (row.get("Symbol") or row.get("symbol") or "").strip().upper()
            if sym:
                out.append(sym)
    return out


def _read_all_symbols() -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    if not ALL_STOCKS_CSV.exists():
        return rows
    with ALL_STOCKS_CSV.open("r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            sym = (r.get("Symbol") or r.get("symbol") or "").strip().upper()
            ex = (r.get("Exchange") or r.get("exchange") or "").strip().upper()
            if sym:
                rows.append({"symbol": sym, "exchange": ex or "NSE"})
    return rows


class Universe:
    """In-memory cache of full stock list + per-index symbol sets."""

    def __init__(self) -> None:
        self.all_rows: List[Dict[str, str]] = _read_all_symbols()
        # index name -> set of NSE symbols (uppercase)
        self.index_symbols: Dict[str, set] = {}
        for name, fname in INDEX_FILES.items():
            self.index_symbols[name] = set(_read_symbols(INDICES_DIR / fname))

    def list_universes(self) -> List[Dict[str, object]]:
        """Return metadata for every available universe (name + count)."""
        out: List[Dict[str, object]] = [
            {"name": "All Stocks", "count": len(self.all_rows)}
        ]
        for name in INDEX_FILES:
            out.append({"name": name, "count": len(self.index_symbols.get(name, set()))})
        return out

    def get(self, name: str) -> List[Dict[str, str]]:
        """Return the (symbol, exchange) rows belonging to a given universe."""
        if name == "All Stocks" or not name:
            return self.all_rows
        symbols = self.index_symbols.get(name)
        if not symbols:
            return []
        # Preserve order from all_rows so scans are consistent
        return [r for r in self.all_rows if r["symbol"].upper() in symbols]


# module-level singleton (loaded once on import)
universe = Universe()