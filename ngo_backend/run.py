"""
Entry point script to run the NGO Backend using Uvicorn.
Usage:
    py run.py
"""

import sys
from pathlib import Path
import uvicorn

# Ensure ngo_backend is in sys.path regardless of execution root
_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from app.core.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
