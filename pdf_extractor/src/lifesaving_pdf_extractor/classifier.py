from __future__ import annotations

import re
from collections import Counter

from .config import LIFESAVING_KEYWORDS, SWIMMING_KEYWORDS
from .models import DocumentContext, DocumentType, LoadedDocument, PageAnalysis, PageContentType


class PageClassifier:
    """Classify individual pages by extraction strategy."""

    def classify_pages(self, document: LoadedDocument) -> list[PageAnalysis]:
        analyses: list[PageAnalysis] = []

        for page in document.pages:
            text_length = len(page.extracted_text.strip())
            has_images = page.image_count > 0

            if text_length >= 80 and not has_images:
                content_type = PageContentType.TEXT
            elif text_length >= 40 and has_images:
                content_type = PageContentType.MIXED
            elif text_length >= 20:
                content_type = PageContentType.TEXT
            elif has_images:
                content_type = PageContentType.IMAGE
            else:
                content_type = PageContentType.EMPTY

            needs_ocr = content_type in {PageContentType.IMAGE, PageContentType.EMPTY}
            if content_type == PageContentType.MIXED and text_length < 120:
                needs_ocr = True

            notes: list[str] = []
            if page.rotation:
                notes.append(f"PDF metadata indicates rotation by {page.rotation} degrees.")
            if content_type == PageContentType.EMPTY:
                notes.append("No extractable text detected on page.")

            analyses.append(
                PageAnalysis(
                    page_number=page.number,
                    content_type=content_type,
                    needs_ocr=needs_ocr,
                    rotation_degrees=page.rotation,
                    rotation_confidence=0.95 if page.rotation else 0.20,
                    notes=notes,
                )
            )

        return analyses


class DocumentClassifier:
    """Derive coarse document type hints without hard-coding one PDF layout."""

    def __init__(self) -> None:
        self.page_classifier = PageClassifier()

    def build_context(self, document: LoadedDocument, provisional_fields: tuple[str, ...]) -> DocumentContext:
        page_analyses = self.page_classifier.classify_pages(document)
        document_type, notes = self._classify_document_type(document)
        return DocumentContext(
            source_path=document.path,
            document_type=document_type,
            metadata=document.metadata,
            page_analyses=page_analyses,
            provisional_fields=provisional_fields,
            classification_notes=notes,
        )

    def _classify_document_type(self, document: LoadedDocument) -> tuple[DocumentType, list[str]]:
        corpus_parts = list(document.metadata.values())
        corpus_parts.append(str(document.path))
        corpus_parts.extend(page.extracted_text for page in document.pages[:3])
        corpus = self._normalize_text(" ".join(corpus_parts))

        keyword_hits = Counter()
        keyword_hits[DocumentType.SWIMMING] = self._score_keywords(corpus, SWIMMING_KEYWORDS)
        keyword_hits[DocumentType.LIFESAVING] = self._score_keywords(corpus, LIFESAVING_KEYWORDS)

        if self._looks_like_lifesaving_context(corpus):
            keyword_hits[DocumentType.LIFESAVING] += 4

        if not any(keyword_hits.values()) and self._looks_like_lifesaving_context(corpus):
            return DocumentType.LIFESAVING, ["Path/metadata strongly suggests a lifesaving competition document."]

        if not any(keyword_hits.values()):
            return DocumentType.UNKNOWN, ["No reliable sport-specific keywords found; using generic parser fallback."]

        best_match, best_score = keyword_hits.most_common(1)[0]
        runner_up_score = keyword_hits.most_common(2)[1][1] if len(keyword_hits) > 1 else 0

        if best_score == runner_up_score:
            return DocumentType.UNKNOWN, ["Keyword scores were ambiguous across document types."]

        return best_match, [f"Keyword-based document classification selected '{best_match.value}'."]

    @staticmethod
    def _normalize_text(value: str) -> str:
        return re.sub(r"\s+", " ", value.casefold())

    @staticmethod
    def _score_keywords(corpus: str, keywords: tuple[str, ...]) -> int:
        return sum(corpus.count(keyword.casefold()) for keyword in keywords)

    @staticmethod
    def _looks_like_lifesaving_context(corpus: str) -> bool:
        hints = ("dlrg", "rettungsschwimmen", "bms", "lms", "jrp", "protokoll einzel")
        return any(hint in corpus for hint in hints)
