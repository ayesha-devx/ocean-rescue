"""
pytest configuration for the OceanRescue backend tests.
Ensures the project root is on sys.path so that
'from backend.app...' imports work correctly.
"""
import sys
from pathlib import Path

# project root = parent of the backend/ directory
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
