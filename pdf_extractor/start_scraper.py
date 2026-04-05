from __future__ import annotations

import os
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
SRC_PATH = PROJECT_ROOT / "src"

os.chdir(PROJECT_ROOT)
if str(SRC_PATH) not in sys.path:
    sys.path.insert(0, str(SRC_PATH))

from lifesaving_pdf_extractor.cli import main


if __name__ == "__main__":
    raise SystemExit(main())
