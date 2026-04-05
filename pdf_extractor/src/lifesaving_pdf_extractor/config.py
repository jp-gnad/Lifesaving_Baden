from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

PROVISIONAL_EXPORT_FIELDS = (
    "wettkampfname",
    "datum",
    "ort",
    "wettkampfnummer",
    "disziplin",
    "altersklasse",
    "geschlecht",
    "platz",
    "name",
    "jahrgang",
    "verein",
    "zeit",
    "punkte",
    "bemerkung",
    "dq_status",
)

SWIMMING_KEYWORDS = (
    "schwimmen",
    "freistil",
    "ruecken",
    "rücken",
    "brust",
    "schmetterling",
    "lagen",
    "vorlauf",
    "endlauf",
)

LIFESAVING_KEYWORDS = (
    "rettungssport",
    "lifesaving",
    "hindernis",
    "manikin",
    "rescue",
    "super lifesaver",
    "line throw",
    "gurtretter",
    "rettungsstaffel",
)

SWIMMING_DISCIPLINE_HINTS = (
    "freistil",
    "ruecken",
    "rücken",
    "brust",
    "schmetterling",
    "lagen",
)

LIFESAVING_DISCIPLINE_HINTS = (
    "hindernis",
    "manikin",
    "line throw",
    "super lifesaver",
    "rescue medley",
    "board race",
    "ski race",
    "ocean",
    "rettungsstaffel",
)


@dataclass(slots=True)
class PipelineSettings:
    """Runtime configuration for the extraction pipeline."""

    input_path: Path
    output_dir: Path
    export_excel: bool = True
    export_json: bool = False
    excel_filename: str = "extracted_records.xlsx"
    json_filename: str = "extracted_records.json"
    review_filename: str = "review_needed.csv"
    log_filename: str = "extractor.log"
    log_level: str = "INFO"
    parser_override: str = "auto"
    render_dpi: int = 200
    force_ocr: bool = False
    ocr_only: bool = False
    disable_ocr: bool = False
    enable_deskew: bool = False
    recursive: bool = True
    provisional_fields: tuple[str, ...] = PROVISIONAL_EXPORT_FIELDS

    @property
    def excel_path(self) -> Path:
        return self.output_dir / self.excel_filename

    @property
    def json_path(self) -> Path:
        return self.output_dir / self.json_filename

    @property
    def review_path(self) -> Path:
        return self.output_dir / self.review_filename

    @property
    def log_path(self) -> Path:
        return self.output_dir / self.log_filename
