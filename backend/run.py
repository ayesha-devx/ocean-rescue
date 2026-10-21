"""
Convenience launch script.

Usage (from project root):
  python backend/run.py
  python backend/run.py --port 8080 --reload
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

cmd = [
    sys.executable, "-m", "uvicorn",
    "backend.app.main:app",
    "--host", "0.0.0.0",
    "--port", "8000",
] + sys.argv[1:]

subprocess.run(cmd, cwd=str(ROOT))
