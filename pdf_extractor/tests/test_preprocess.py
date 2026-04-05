from pathlib import Path
from unittest import TestCase
from unittest.mock import patch

from lifesaving_pdf_extractor.config import PipelineSettings
from lifesaving_pdf_extractor.models import LoadedPage, OCRResult, PageAnalysis, PageContentType
from lifesaving_pdf_extractor.preprocess import PagePreprocessor


class DummyOCRService:
    def detect_orientation(self, image: object, page_number: int) -> int | None:
        return None

    def extract_text(self, image: object, page_number: int) -> OCRResult:
        return OCRResult(text="OCR ONLY TEXT", engine="dummy")


class PreprocessTests(TestCase):
    def test_ocr_only_mode_ignores_embedded_pdf_text(self) -> None:
        preprocessor = PagePreprocessor(ocr_service=DummyOCRService())
        settings = PipelineSettings(
            input_path=Path("input.pdf"),
            output_dir=Path("output"),
            ocr_only=True,
        )
        page = LoadedPage(
            number=1,
            rotation=0,
            extracted_text="BAD PDF TEXT",
            image_count=1,
        )
        analysis = PageAnalysis(
            page_number=1,
            content_type=PageContentType.TEXT,
            needs_ocr=False,
            rotation_degrees=0,
            rotation_confidence=0.0,
        )

        with patch.object(PagePreprocessor, "_render_page_to_image", return_value=object()):
            result = preprocessor.process_page(Path("input.pdf"), page, analysis, settings)

        self.assertEqual(result.text, "OCR ONLY TEXT")
        self.assertEqual(result.text_source, "ocr")
        self.assertTrue(result.used_ocr)

    def test_force_ocr_mode_merges_pdf_text_and_ocr_text(self) -> None:
        preprocessor = PagePreprocessor(ocr_service=DummyOCRService())
        settings = PipelineSettings(
            input_path=Path("input.pdf"),
            output_dir=Path("output"),
            force_ocr=True,
        )
        page = LoadedPage(
            number=1,
            rotation=0,
            extracted_text="PDF TEXT",
            image_count=1,
        )
        analysis = PageAnalysis(
            page_number=1,
            content_type=PageContentType.TEXT,
            needs_ocr=False,
            rotation_degrees=0,
            rotation_confidence=0.0,
        )

        with patch.object(PagePreprocessor, "_render_page_to_image", return_value=object()):
            result = preprocessor.process_page(Path("input.pdf"), page, analysis, settings)

        self.assertEqual(result.text, "PDF TEXT\nOCR ONLY TEXT")
        self.assertEqual(result.text_source, "merged")
        self.assertTrue(result.used_ocr)
