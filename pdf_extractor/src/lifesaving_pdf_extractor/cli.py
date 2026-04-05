from __future__ import annotations

import argparse
import logging
from pathlib import Path
from typing import Sequence

from .config import PipelineSettings
from .logging_setup import configure_logging
from .workflow import ExtractionPipeline


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Extract provisional structured data from swimming and lifesaving PDF protocols."
    )
    parser.add_argument("input_path", nargs="?", help="Path to a single PDF or a directory containing PDFs.")
    parser.add_argument(
        "--output-dir",
        default="output",
        help="Directory for Excel/JSON/review outputs. Defaults to ./output relative to the current working directory.",
    )
    parser.add_argument(
        "--parser",
        default="auto",
        choices=("auto", "generic", "swimming", "lifesaving"),
        help="Force a parser, or let the keyword classifier decide.",
    )
    parser.add_argument("--json", action="store_true", help="Also write JSON output besides Excel.")
    parser.add_argument("--force-ocr", action="store_true", help="Run OCR for every page, even when text exists.")
    parser.add_argument(
        "--ocr-only",
        action="store_true",
        help="Use only OCR text for all pages and ignore embedded PDF text. Recommended for poor text layers.",
    )
    parser.add_argument("--disable-ocr", action="store_true", help="Disable OCR fallback entirely.")
    parser.add_argument("--deskew", action="store_true", help="Try deskew correction when OpenCV is available.")
    parser.add_argument("--dpi", type=int, default=200, help="Render DPI for OCR preparation. Defaults to 200.")
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=("DEBUG", "INFO", "WARNING", "ERROR"),
        help="Logging verbosity.",
    )
    parser.add_argument(
        "--no-recursive",
        action="store_true",
        help="Do not recurse into nested folders when the input path is a directory.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_argument_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.ocr_only and args.disable_ocr:
        parser.error("--ocr-only and --disable-ocr cannot be used together.")
    if args.force_ocr and args.disable_ocr:
        parser.error("--force-ocr and --disable-ocr cannot be used together.")

    input_path, selected_via_dialog = _resolve_input_path(args.input_path)
    if input_path is None:
        print("No PDF selected. Extraction cancelled.")
        return 0

    settings = PipelineSettings(
        input_path=input_path,
        output_dir=Path(args.output_dir).resolve(),
        export_json=args.json,
        parser_override=args.parser,
        render_dpi=args.dpi,
        force_ocr=args.force_ocr,
        ocr_only=args.ocr_only,
        disable_ocr=args.disable_ocr,
        enable_deskew=args.deskew,
        log_level=args.log_level,
        recursive=not args.no_recursive,
    )

    configure_logging(settings.log_level, settings.log_path)
    pipeline = ExtractionPipeline()
    try:
        result = pipeline.run(settings)
    except Exception as exc:
        logging.getLogger(__name__).exception("Extraction failed.")
        print(f"Extraction failed: {exc}")
        if selected_via_dialog:
            _show_message("Extraction failed", f"Extraction failed:\n{exc}", error=True)
        return 1

    summary = (
        f"Processed {result.documents_processed} document(s), "
        f"failed {result.documents_failed}, "
        f"created {len(result.records)} record(s), "
        f"flagged {len(result.review_flags)} review item(s)."
    )
    print(summary)
    for label, output_path in result.output_files.items():
        print(f"{label}: {output_path}")

    if selected_via_dialog:
        details = [summary]
        for label, output_path in result.output_files.items():
            details.append(f"{label}: {output_path}")
        _show_message("Extraction finished", "\n".join(details))

    return 0 if result.documents_failed == 0 else 1


def _resolve_input_path(input_path: str | None) -> tuple[Path | None, bool]:
    if input_path:
        return Path(input_path).resolve(), False

    selected = _choose_pdf_file()
    if not selected:
        return None, True
    return Path(selected).resolve(), True


def _choose_pdf_file() -> str:
    try:
        from tkinter import Tk, filedialog
    except Exception:
        return input("Path to the PDF file: ").strip()

    try:
        root = Tk()
    except Exception:
        return input("Path to the PDF file: ").strip()

    root.withdraw()
    try:
        root.attributes("-topmost", True)
    except Exception:
        pass
    try:
        selected = filedialog.askopenfilename(
            title="Select the PDF protocol to extract",
            filetypes=[("PDF files", "*.pdf"), ("All files", "*.*")],
        )
    finally:
        root.destroy()
    return selected


def _show_message(title: str, message: str, error: bool = False) -> None:
    try:
        from tkinter import Tk, messagebox
    except Exception:
        return

    try:
        root = Tk()
    except Exception:
        return

    root.withdraw()
    try:
        root.attributes("-topmost", True)
    except Exception:
        pass
    try:
        if error:
            messagebox.showerror(title, message)
        else:
            messagebox.showinfo(title, message)
    finally:
        root.destroy()


if __name__ == "__main__":
    raise SystemExit(main())
