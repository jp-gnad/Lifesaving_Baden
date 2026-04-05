from __future__ import annotations

import logging
from pathlib import Path

from .classifier import DocumentClassifier
from .config import PipelineSettings
from .exporters import ExcelExporter, JSONExporter, ReviewExporter
from .loader import PDFLoader
from .models import DocumentContext, PipelineResult, ReviewFlag
from .normalize import ProtocolNormalizer
from .parsers.registry import ParserRegistry
from .preprocess import PagePreprocessor

LOGGER = logging.getLogger(__name__)


class ExtractionPipeline:
    """Orchestrate discovery, classification, parsing, normalization and export."""

    def __init__(
        self,
        loader: PDFLoader | None = None,
        classifier: DocumentClassifier | None = None,
        preprocessor: PagePreprocessor | None = None,
        registry: ParserRegistry | None = None,
        normalizer: ProtocolNormalizer | None = None,
        excel_exporter: ExcelExporter | None = None,
        json_exporter: JSONExporter | None = None,
        review_exporter: ReviewExporter | None = None,
    ) -> None:
        self.loader = loader or PDFLoader()
        self.classifier = classifier or DocumentClassifier()
        self.preprocessor = preprocessor or PagePreprocessor()
        self.registry = registry or ParserRegistry()
        self.normalizer = normalizer or ProtocolNormalizer()
        self.excel_exporter = excel_exporter or ExcelExporter()
        self.json_exporter = json_exporter or JSONExporter()
        self.review_exporter = review_exporter or ReviewExporter()

    def run(self, settings: PipelineSettings) -> PipelineResult:
        pdf_paths = self.loader.discover_pdfs(settings.input_path, recursive=settings.recursive)
        if not pdf_paths:
            raise FileNotFoundError(f"No PDF files found below '{settings.input_path}'.")

        records = []
        review_flags: list[ReviewFlag] = []
        documents_processed = 0
        documents_failed = 0

        LOGGER.info("Starting extraction for %s PDF file(s).", len(pdf_paths))

        for pdf_path in pdf_paths:
            LOGGER.info("Processing %s", pdf_path)
            try:
                document = self.loader.load_document(pdf_path)
                context = self.classifier.build_context(document, settings.provisional_fields)
                parser = self.registry.resolve(context, settings.parser_override)
                context.parser_name = parser.name

                processed_pages = []
                for page, analysis in zip(document.pages, context.page_analyses, strict=True):
                    processed_page = self.preprocessor.process_page(
                        source_path=document.path,
                        page=page,
                        analysis=analysis,
                        settings=settings,
                    )
                    processed_pages.append(processed_page)
                    review_flags.extend(processed_page.review_flags)

                review_flags.extend(self._build_context_flags(context))

                ocr_blocking_flag = self._build_ocr_blocking_flag(document, context, processed_pages)
                if ocr_blocking_flag is not None:
                    review_flags.append(ocr_blocking_flag)
                    documents_failed += 1
                    continue

                parser_result = parser.parse(document, context, processed_pages)
                normalized_records = [
                    self.normalizer.normalize_record(record, settings.provisional_fields)
                    for record in parser_result.records
                ]

                records.extend(normalized_records)
                review_flags.extend(parser_result.review_flags)
                documents_processed += 1
            except Exception as exc:
                LOGGER.exception("Processing failed for %s", pdf_path)
                documents_failed += 1
                review_flags.append(
                    ReviewFlag(
                        code="document_processing_failed",
                        message=str(exc),
                        source_file=pdf_path,
                        confidence=0.95,
                    )
                )

        output_files = self._export_outputs(records, review_flags, settings)
        return PipelineResult(
            documents_processed=documents_processed,
            documents_failed=documents_failed,
            records=records,
            review_flags=review_flags,
            output_files=output_files,
        )

    @staticmethod
    def _build_context_flags(context: DocumentContext) -> list[ReviewFlag]:
        flags: list[ReviewFlag] = []
        for note in context.classification_notes:
            if context.document_type.value != "unknown" and "ambiguous" not in note.casefold() and "fallback" not in note.casefold():
                continue
            flags.append(
                ReviewFlag(
                    code="document_classification_note",
                    message=note,
                    source_file=context.source_path,
                )
            )
        return flags

    @staticmethod
    def _build_ocr_blocking_flag(
        document,
        context: DocumentContext,
        processed_pages,
    ) -> ReviewFlag | None:
        ocr_problem_codes = {"ocr_dependency_missing", "ocr_failed"}
        blocked_pages = 0
        empty_pages = 0

        for page, analysis in zip(processed_pages, context.page_analyses, strict=True):
            page_problem_codes = {flag.code for flag in page.review_flags}
            if analysis.needs_ocr and page_problem_codes.intersection(ocr_problem_codes):
                blocked_pages += 1
            if analysis.needs_ocr and not page.text.strip():
                empty_pages += 1

        if blocked_pages == 0:
            return None

        if blocked_pages >= max(2, len(document.pages) // 2) or empty_pages >= max(2, len(document.pages) // 2):
            return ReviewFlag(
                code="document_requires_ocr_setup",
                message=(
                    "Most pages appear scan-based and could not be read because OCR is unavailable. "
                    "Install Tesseract OCR and retry this PDF."
                ),
                source_file=document.path,
                confidence=0.99,
            )

        return None

    def _export_outputs(
        self,
        records: list,
        review_flags: list[ReviewFlag],
        settings: PipelineSettings,
    ) -> dict[str, Path]:
        output_files: dict[str, Path] = {}

        if settings.export_excel and records:
            output_files["excel"] = self.excel_exporter.export(records, settings.excel_path, settings.provisional_fields)
        if settings.export_json and records:
            output_files["json"] = self.json_exporter.export(records, settings.json_path, settings.provisional_fields)

        output_files["review"] = self.review_exporter.export(records, review_flags, settings.review_path)
        output_files["log"] = settings.log_path
        return output_files
