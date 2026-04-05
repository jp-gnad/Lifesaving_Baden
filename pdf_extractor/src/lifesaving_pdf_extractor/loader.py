from __future__ import annotations

from pathlib import Path
from typing import Iterable

from .models import LoadedDocument, LoadedPage

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover - dependency is optional for unit tests
    PdfReader = None


class PDFLoader:
    """Discover and load PDFs without assuming a concrete layout."""

    def discover_pdfs(self, input_path: Path, recursive: bool = True) -> list[Path]:
        if input_path.is_file():
            if input_path.suffix.lower() != ".pdf":
                raise ValueError(f"Only PDF files are supported: {input_path}")
            return [input_path]

        if not input_path.exists():
            raise FileNotFoundError(f"Input path does not exist: {input_path}")

        pattern = "**/*.pdf" if recursive else "*.pdf"
        return sorted(path for path in input_path.glob(pattern) if path.is_file())

    def load_document(self, pdf_path: Path) -> LoadedDocument:
        if PdfReader is None:
            raise RuntimeError("pypdf is not installed. Install dependencies from requirements.txt first.")

        reader = PdfReader(str(pdf_path))
        metadata = self._normalize_metadata(reader.metadata)
        pages: list[LoadedPage] = []

        for index, page in enumerate(reader.pages, start=1):
            pages.append(
                LoadedPage(
                    number=index,
                    rotation=int(page.rotation or 0),
                    extracted_text=self._extract_page_text(page),
                    image_count=self._count_images(page),
                    width=float(page.mediabox.width) if getattr(page, "mediabox", None) else None,
                    height=float(page.mediabox.height) if getattr(page, "mediabox", None) else None,
                )
            )

        return LoadedDocument(path=pdf_path, page_count=len(pages), metadata=metadata, pages=pages)

    @staticmethod
    def _normalize_metadata(raw_metadata: object) -> dict[str, str]:
        if not raw_metadata:
            return {}

        normalized: dict[str, str] = {}
        for key, value in dict(raw_metadata).items():
            clean_key = str(key).strip("/").lower()
            normalized[clean_key] = "" if value is None else str(value).strip()
        return normalized

    @staticmethod
    def _count_images(page: object) -> int:
        try:
            resources = page.get("/Resources")
            if resources is None:
                return 0

            resources = resources.get_object() if hasattr(resources, "get_object") else resources
            x_object = resources.get("/XObject")
            if x_object is None:
                return 0

            x_object = x_object.get_object() if hasattr(x_object, "get_object") else x_object
            image_count = 0
            for candidate in x_object.values():
                obj = candidate.get_object() if hasattr(candidate, "get_object") else candidate
                if obj.get("/Subtype") == "/Image":
                    image_count += 1
            return image_count
        except Exception:
            return 0

    @staticmethod
    def _extract_page_text(page: object) -> str:
        layout_text = ""
        plain_text = ""

        try:
            layout_text = (page.extract_text(extraction_mode="layout") or "").strip()
        except TypeError:
            layout_text = ""
        except Exception:
            layout_text = ""

        try:
            plain_text = (page.extract_text() or "").strip()
        except Exception:
            plain_text = ""

        if layout_text and ("  " in layout_text or len(layout_text.splitlines()) >= len(plain_text.splitlines())):
            return layout_text

        return plain_text or layout_text


def summarize_paths(paths: Iterable[Path]) -> str:
    """Small helper for logging or CLI summaries."""

    return ", ".join(str(path) for path in paths)
