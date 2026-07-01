"""Central logging configuration.

Logs are written to:
  - stdout (console / uvicorn output)
  - backend/logs/app.log       (rotating, everything)
  - backend/logs/scan.log      (only per-symbol scan events - handy for auditing)
"""
from __future__ import annotations

import logging
import logging.handlers
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

APP_LOG = LOGS_DIR / "app.log"
SCAN_LOG = LOGS_DIR / "scan.log"

_FMT = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
_DATEFMT = "%Y-%m-%d %H:%M:%S"


def setup_logging(level: int = logging.INFO) -> None:
    """Configure root logging + separate scan logger. Idempotent."""
    root = logging.getLogger()
    root.setLevel(level)

    # Remove pre-existing handlers to avoid duplicates when reloaded.
    for h in list(root.handlers):
        root.removeHandler(h)

    formatter = logging.Formatter(_FMT, datefmt=_DATEFMT)

    # Console
    console = logging.StreamHandler()
    console.setLevel(level)
    console.setFormatter(formatter)
    root.addHandler(console)

    # App file (everything, rotates at 5 MB, keeps 5 backups)
    app_file = logging.handlers.RotatingFileHandler(
        APP_LOG, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    app_file.setLevel(level)
    app_file.setFormatter(formatter)
    root.addHandler(app_file)

    # Dedicated scan logger -> its own file. Also propagates to root so it
    # still shows in console + app.log.
    scan_logger = logging.getLogger("scan")
    scan_logger.setLevel(logging.INFO)
    scan_file = logging.handlers.RotatingFileHandler(
        SCAN_LOG, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    scan_file.setLevel(logging.INFO)
    scan_file.setFormatter(formatter)
    # Avoid double-adding on reload
    for h in list(scan_logger.handlers):
        scan_logger.removeHandler(h)
    scan_logger.addHandler(scan_file)

    # Access logs from uvicorn already go to root - don't silence them.
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)

    root.info("logging initialised · app=%s · scan=%s", APP_LOG, SCAN_LOG)


def scan_logger() -> logging.Logger:
    return logging.getLogger("scan")