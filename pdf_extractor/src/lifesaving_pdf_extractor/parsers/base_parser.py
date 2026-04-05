from __future__ import annotations

import re
from abc import ABC, abstractmethod

from ..models import DocumentContext, ExtractedRecord, ExtractionStatus, LoadedDocument, ParserResult, PreprocessedPage


class BaseProtocolParser(ABC):
    """Abstract parser contract for protocol-specific extraction rules."""

    name = "base"

    @abstractmethod
    def parse(
        self,
        document: LoadedDocument,
        context: DocumentContext,
        pages: list[PreprocessedPage],
    ) -> ParserResult:
        raise NotImplementedError

    def build_base_payload(self, context: DocumentContext) -> dict[str, str]:
        return {field: "" for field in context.provisional_fields}

    def extract_document_header(self, pages: list[PreprocessedPage]) -> dict[str, str]:
        combined_text = "\n".join(page.text for page in pages if page.text)
        lines = [line.strip() for line in combined_text.splitlines() if line.strip()]
        if not lines:
            return {}

        header: dict[str, str] = {
            "wettkampfname": lines[0][:160],
            "datum": self._find_first_match(combined_text, r"\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b"),
            "ort": self._extract_after_label(combined_text, ("ort", "venue", "location")),
            "wettkampfnummer": self._find_first_match(
                combined_text,
                r"(?:wettkampf(?:nummer)?|event)\s*(?:nr\.?|number)?\s*[:#]?\s*([A-Za-z0-9/-]+)",
                group=1,
            ),
        }
        return {key: value for key, value in header.items() if value}

    def build_record(
        self,
        document: LoadedDocument,
        context: DocumentContext,
        page_number: int | None,
        data: dict[str, str],
        status: ExtractionStatus,
        confidence: float,
        review_notes: list[str],
        raw_excerpt: str,
    ) -> ExtractedRecord:
        return ExtractedRecord(
            source_file=document.path,
            page_number=page_number,
            parser_name=context.parser_name or self.name,
            status=status,
            confidence=confidence,
            data=data,
            review_notes=review_notes,
            raw_excerpt=raw_excerpt[:2000],
        )

    @staticmethod
    def _find_first_match(value: str, pattern: str, group: int = 0) -> str:
        match = re.search(pattern, value, flags=re.IGNORECASE)
        if not match:
            return ""
        return match.group(group).strip()

    @staticmethod
    def _extract_after_label(value: str, labels: tuple[str, ...]) -> str:
        for line in value.splitlines():
            normalized = line.strip()
            for label in labels:
                prefix = f"{label}:"
                if normalized.casefold().startswith(prefix):
                    return normalized[len(prefix) :].strip()
        return ""
