from __future__ import annotations

import io
from pathlib import Path
from typing import Any

from .config import PipelineSettings
from .models import LoadedPage, PageAnalysis, PreprocessedPage, ReviewFlag
from .ocr import OCRService

try:
    import fitz
except ImportError:  # pragma: no cover - dependency is optional for unit tests
    fitz = None

try:
    from PIL import Image
except ImportError:  # pragma: no cover - dependency is optional for unit tests
    Image = None

try:
    import cv2
    import numpy as np
except ImportError:  # pragma: no cover - dependency is optional for unit tests
    cv2 = None
    np = None


class PagePreprocessor:
    """Prepare pages for OCR while keeping text-based extraction untouched when possible."""

    def __init__(self, ocr_service: OCRService | None = None) -> None:
        self.ocr_service = ocr_service or OCRService()

    def process_page(
        self,
        source_path: Path,
        page: LoadedPage,
        analysis: PageAnalysis,
        settings: PipelineSettings,
    ) -> PreprocessedPage:
        review_flags: list[ReviewFlag] = []
        direct_text = page.extracted_text.strip()

        if not self._should_use_ocr(analysis, settings):
            return PreprocessedPage(
                page_number=page.number,
                text=direct_text,
                text_source="pdf_text",
                used_ocr=False,
            )

        if settings.disable_ocr:
            review_flags.append(
                ReviewFlag(
                    code="ocr_disabled",
                    message="Page likely needs OCR, but OCR was disabled by CLI setting.",
                    source_file=source_path,
                    page_number=page.number,
                    confidence=0.95,
                )
            )
            return PreprocessedPage(
                page_number=page.number,
                text=direct_text,
                text_source="pdf_text" if direct_text else "empty",
                used_ocr=False,
                review_flags=review_flags,
            )

        rendered_image = self._render_page_to_image(source_path, page.number, settings.render_dpi)
        if rendered_image is None:
            review_flags.append(
                ReviewFlag(
                    code="page_render_unavailable",
                    message="Page rendering dependency missing; OCR fallback skipped.",
                    source_file=source_path,
                    page_number=page.number,
                    confidence=0.90,
                )
            )
            return PreprocessedPage(
                page_number=page.number,
                text=direct_text,
                text_source="pdf_text" if direct_text else "empty",
                used_ocr=False,
                review_flags=review_flags,
            )

        applied_rotation = 0
        if analysis.rotation_degrees:
            rendered_image = rendered_image.rotate(-analysis.rotation_degrees, expand=True, fillcolor="white")
            applied_rotation += analysis.rotation_degrees

        detected_rotation = self.ocr_service.detect_orientation(rendered_image, page.number)
        if detected_rotation:
            rendered_image = rendered_image.rotate(-detected_rotation, expand=True, fillcolor="white")
            applied_rotation += detected_rotation

        if settings.enable_deskew:
            rendered_image, deskew_note = self._deskew(rendered_image)
            if deskew_note:
                review_flags.append(
                    ReviewFlag(
                        code="deskew_note",
                        message=deskew_note,
                        source_file=source_path,
                        page_number=page.number,
                    )
                )

        ocr_result = self.ocr_service.extract_text(rendered_image, page.number)
        for flag in ocr_result.review_flags:
            flag.source_file = source_path
        review_flags.extend(ocr_result.review_flags)

        merged_text = self._merge_text_sources(direct_text, ocr_result.text)
        if merged_text and direct_text and ocr_result.text and merged_text != direct_text:
            text_source = "merged"
        elif ocr_result.text:
            text_source = "ocr"
        elif direct_text:
            text_source = "pdf_text"
        else:
            text_source = "empty"

        return PreprocessedPage(
            page_number=page.number,
            text=merged_text,
            text_source=text_source,
            used_ocr=bool(ocr_result.text),
            applied_rotation=applied_rotation,
            review_flags=review_flags,
        )

    @staticmethod
    def _should_use_ocr(analysis: PageAnalysis, settings: PipelineSettings) -> bool:
        return settings.force_ocr or analysis.needs_ocr

    @staticmethod
    def _merge_text_sources(direct_text: str, ocr_text: str) -> str:
        direct_text = direct_text.strip()
        ocr_text = ocr_text.strip()

        if not direct_text:
            return ocr_text
        if not ocr_text:
            return direct_text
        if ocr_text in direct_text:
            return direct_text
        if direct_text in ocr_text:
            return ocr_text
        return "\n".join(part for part in (direct_text, ocr_text) if part)

    @staticmethod
    def _render_page_to_image(source_path: Path, page_number: int, dpi: int) -> Any | None:
        if fitz is None or Image is None:
            return None

        with fitz.open(source_path) as document:
            page = document.load_page(page_number - 1)
            zoom = dpi / 72
            pixmap = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
            image = Image.open(io.BytesIO(pixmap.tobytes("png")))
            image.load()
            return image

    @staticmethod
    def _deskew(image: Any) -> tuple[Any, str | None]:
        if cv2 is None or np is None:
            return image, "Deskew skipped because OpenCV/numpy is not installed."

        grayscale = cv2.cvtColor(np.array(image.convert("RGB")), cv2.COLOR_RGB2GRAY)
        coordinates = np.column_stack(np.where(grayscale < 250))
        if coordinates.size == 0:
            return image, None

        angle = cv2.minAreaRect(coordinates)[-1]
        angle = -(90 + angle) if angle < -45 else -angle
        if abs(angle) < 0.20:
            return image, None

        return image.rotate(angle, expand=True, fillcolor="white"), f"Deskew applied with angle {angle:.2f}."
