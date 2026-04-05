from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


class PageContentType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    MIXED = "mixed"
    EMPTY = "empty"


class DocumentType(str, Enum):
    UNKNOWN = "unknown"
    SWIMMING = "swimming"
    LIFESAVING = "lifesaving"


class ExtractionStatus(str, Enum):
    COMPLETE = "complete"
    PARTIAL = "partial"
    NEEDS_REVIEW = "needs_review"


@dataclass(slots=True)
class ReviewFlag:
    code: str
    message: str
    source_file: Path | None = None
    page_number: int | None = None
    confidence: float | None = None

    def to_row(self) -> dict[str, str]:
        return {
            "source_file": "" if self.source_file is None else str(self.source_file),
            "page_number": "" if self.page_number is None else str(self.page_number),
            "code": self.code,
            "message": self.message,
            "confidence": "" if self.confidence is None else f"{self.confidence:.2f}",
            "parser_name": "",
            "status": ExtractionStatus.NEEDS_REVIEW.value,
            "raw_excerpt": "",
        }


@dataclass(slots=True)
class LoadedPage:
    number: int
    rotation: int
    extracted_text: str
    image_count: int
    width: float | None = None
    height: float | None = None


@dataclass(slots=True)
class LoadedDocument:
    path: Path
    page_count: int
    metadata: dict[str, str]
    pages: list[LoadedPage]

    @property
    def combined_text(self) -> str:
        return "\n".join(page.extracted_text for page in self.pages if page.extracted_text)


@dataclass(slots=True)
class PageAnalysis:
    page_number: int
    content_type: PageContentType
    needs_ocr: bool
    rotation_degrees: int
    rotation_confidence: float
    notes: list[str] = field(default_factory=list)


@dataclass(slots=True)
class PreprocessedPage:
    page_number: int
    text: str
    text_source: str
    used_ocr: bool
    applied_rotation: int = 0
    review_flags: list[ReviewFlag] = field(default_factory=list)


@dataclass(slots=True)
class OCRResult:
    text: str
    engine: str
    detected_rotation: int | None = None
    review_flags: list[ReviewFlag] = field(default_factory=list)


@dataclass(slots=True)
class DocumentContext:
    source_path: Path
    document_type: DocumentType
    metadata: dict[str, str]
    page_analyses: list[PageAnalysis]
    provisional_fields: tuple[str, ...]
    parser_name: str = ""
    classification_notes: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ExtractedRecord:
    source_file: Path
    page_number: int | None
    parser_name: str
    status: ExtractionStatus
    confidence: float
    data: dict[str, str]
    review_notes: list[str] = field(default_factory=list)
    raw_excerpt: str = ""

    def to_export_row(self, provisional_fields: tuple[str, ...]) -> dict[str, str]:
        row = {field: self.data.get(field, "") for field in provisional_fields}
        row.update(
            {
                "source_file": str(self.source_file),
                "page_number": "" if self.page_number is None else str(self.page_number),
                "parser_name": self.parser_name,
                "status": self.status.value,
                "confidence": f"{self.confidence:.2f}",
                "raw_excerpt": self.raw_excerpt,
                "review_notes": " | ".join(self.review_notes),
            }
        )
        return row

    def to_json_dict(self, provisional_fields: tuple[str, ...]) -> dict[str, str | int | float | list[str] | None]:
        payload: dict[str, str | int | float | list[str] | None] = {
            "source_file": str(self.source_file),
            "page_number": self.page_number,
            "parser_name": self.parser_name,
            "status": self.status.value,
            "confidence": round(self.confidence, 2),
            "raw_excerpt": self.raw_excerpt,
            "review_notes": self.review_notes,
        }
        for field in provisional_fields:
            payload[field] = self.data.get(field, "")
        return payload


@dataclass(slots=True)
class ParserResult:
    records: list[ExtractedRecord] = field(default_factory=list)
    review_flags: list[ReviewFlag] = field(default_factory=list)


@dataclass(slots=True)
class PipelineResult:
    documents_processed: int
    documents_failed: int
    records: list[ExtractedRecord]
    review_flags: list[ReviewFlag]
    output_files: dict[str, Path]
