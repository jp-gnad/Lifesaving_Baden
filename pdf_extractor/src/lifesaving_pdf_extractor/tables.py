from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class TableCandidate:
    """Placeholder container for future table extraction results."""

    page_number: int
    rows: list[list[str]] = field(default_factory=list)
    extraction_notes: list[str] = field(default_factory=list)


class TableExtractionStrategy:
    """Extension point for future table-aware protocol parsers."""

    def extract(self, page_text: str, page_number: int) -> TableCandidate:
        return TableCandidate(
            page_number=page_number,
            extraction_notes=["Table extraction is not implemented yet for unknown layouts."],
        )
