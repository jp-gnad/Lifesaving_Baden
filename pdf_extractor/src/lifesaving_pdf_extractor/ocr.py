from __future__ import annotations

from .models import OCRResult, ReviewFlag

try:
    import pytesseract
except ImportError:  # pragma: no cover - dependency is optional for unit tests
    pytesseract = None


class OCRService:
    """Thin wrapper around Tesseract with graceful degradation."""

    def __init__(self, languages: str = "deu+eng") -> None:
        self.languages = languages

    @property
    def available(self) -> bool:
        if pytesseract is None:
            return False

        try:
            pytesseract.get_tesseract_version()
            return True
        except Exception:
            return False

    @property
    def availability_message(self) -> str:
        if pytesseract is None:
            return "pytesseract is not installed; OCR fallback could not run."
        try:
            pytesseract.get_tesseract_version()
        except Exception:
            return "Tesseract OCR is not installed or not in PATH; OCR fallback could not run."
        return ""

    def detect_orientation(self, image: object, page_number: int) -> int | None:
        if not self.available:
            return None

        try:
            result = pytesseract.image_to_osd(image, output_type=pytesseract.Output.DICT)
            rotation = int(result.get("rotate", 0) or 0)
            return rotation if rotation in {90, 180, 270} else None
        except Exception:
            return None

    def extract_text(self, image: object, page_number: int) -> OCRResult:
        if not self.available:
            return OCRResult(
                text="",
                engine="unavailable",
                review_flags=[
                    ReviewFlag(
                        code="ocr_dependency_missing",
                        message=self.availability_message,
                        page_number=page_number,
                    )
                ],
            )

        try:
            text = pytesseract.image_to_string(image, lang=self.languages, config="--psm 6")
            return OCRResult(text=text.strip(), engine="tesseract")
        except Exception as exc:
            return OCRResult(
                text="",
                engine="tesseract",
                review_flags=[
                    ReviewFlag(
                        code="ocr_failed",
                        message=f"OCR failed on page {page_number}: {exc}",
                        page_number=page_number,
                    )
                ],
            )
