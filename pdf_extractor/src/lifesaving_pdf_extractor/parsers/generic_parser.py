from __future__ import annotations

from ..models import DocumentContext, ExtractionStatus, LoadedDocument, ParserResult, PreprocessedPage, ReviewFlag
from .base_parser import BaseProtocolParser


class GenericProtocolParser(BaseProtocolParser):
    """Fallback parser that produces review-friendly placeholder rows."""

    name = "generic"

    def parse(
        self,
        document: LoadedDocument,
        context: DocumentContext,
        pages: list[PreprocessedPage],
    ) -> ParserResult:
        header_data = self.extract_document_header(pages)
        result = ParserResult()

        for page in pages:
            if not page.text.strip():
                result.review_flags.append(
                    ReviewFlag(
                        code="empty_page_after_preprocessing",
                        message="Page did not yield text after direct extraction and OCR fallback.",
                        source_file=document.path,
                        page_number=page.page_number,
                        confidence=0.95,
                    )
                )
                continue

            payload = self.build_base_payload(context)
            payload.update(header_data)
            payload["disziplin"] = self.detect_discipline(page.text)
            payload["bemerkung"] = (
                "Generischer Platzhalterparser aktiv; Felder muessen mit echten Beispiel-PDFs verfeinert werden."
            )

            populated_fields = sum(1 for value in payload.values() if value)
            status = ExtractionStatus.PARTIAL if populated_fields >= 3 else ExtractionStatus.NEEDS_REVIEW
            confidence = min(0.20 + populated_fields * 0.05 + (0.10 if page.text_source == "pdf_text" else 0.0), 0.65)

            review_notes = ["Format-spezifische Parser-Regeln fehlen noch."]
            if page.used_ocr:
                review_notes.append("OCR wurde fuer diese Seite verwendet.")
            if page.text_source == "merged":
                review_notes.append("PDF-Text und OCR-Text wurden zusammengefuehrt.")

            excerpt = " ".join(page.text.split())[:280]
            result.records.append(
                self.build_record(
                    document=document,
                    context=context,
                    page_number=page.page_number,
                    data=payload,
                    status=status,
                    confidence=confidence,
                    review_notes=review_notes,
                    raw_excerpt=excerpt,
                )
            )

        if not result.records:
            result.review_flags.append(
                ReviewFlag(
                    code="no_records_emitted",
                    message="No parser records were created for this document.",
                    source_file=document.path,
                    confidence=0.95,
                )
            )

        return result

    def detect_discipline(self, page_text: str) -> str:
        return ""
