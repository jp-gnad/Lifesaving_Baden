from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from lifesaving_pdf_extractor.config import PROVISIONAL_EXPORT_FIELDS
from lifesaving_pdf_extractor.exporters import ExcelExporter, ReviewExporter
from lifesaving_pdf_extractor.models import ExtractedRecord, ExtractionStatus, ReviewFlag
from openpyxl import load_workbook


class ExporterTests(unittest.TestCase):
    def test_csv_and_review_export_write_expected_files(self) -> None:
        record = ExtractedRecord(
            source_file=Path("demo.pdf"),
            page_number=1,
            parser_name="generic",
            status=ExtractionStatus.PARTIAL,
            confidence=0.4,
            data={
                "wettkampfname": "Demo Cup",
                "datum": "2026-04-05",
                "disziplin": "hindernis",
            },
            review_notes=["Parser rules are still provisional."],
            raw_excerpt="Demo text",
        )
        flag = ReviewFlag(code="check_me", message="Needs a human review.", source_file=Path("demo.pdf"), page_number=1)

        with TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            excel_path = ExcelExporter().export([record], temp_path / "records.xlsx", PROVISIONAL_EXPORT_FIELDS)
            review_path = ReviewExporter().export([record], [flag], temp_path / "review.csv")

            workbook = load_workbook(excel_path)
            worksheet = workbook.active
            excel_rows = list(worksheet.iter_rows(values_only=True))
            review_content = review_path.read_text(encoding="utf-8")

        flattened = " | ".join("" if value is None else str(value) for row in excel_rows for value in row)
        self.assertIn("Demo Cup", flattened)
        self.assertIn("Parser rules are still provisional.", review_content)
        self.assertIn("check_me", review_content)

    def test_csv_export_maps_single_event_into_final_schema(self) -> None:
        record = ExtractedRecord(
            source_file=Path("jrp.pdf"),
            page_number=1,
            parser_name="lifesaving",
            status=ExtractionStatus.COMPLETE,
            confidence=0.9,
            data={
                "wettkampfname": "Junioren Rettungspokal 2025",
                "datum": "2025-06-28",
                "ort": "Bremen",
                "disziplin": "100m Hindernisschwimmen",
                "altersklasse": "AK 17/18",
                "geschlecht": "weiblich",
                "platz": "1",
                "name": "Muster, Anna",
                "jahrgang": "08",
                "verein": "Baden",
                "zeit": "00:01:08.88",
                "punkte": "852",
                "bemerkung": "Runde=A-Finale; Lauf=1; Bahn=4",
                "dq_status": "",
            },
            review_notes=[],
            raw_excerpt="1   Muster, Anna  Baden  08  1  4  1:08,88  852",
        )

        with TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            excel_path = ExcelExporter().export([record], temp_path / "records.xlsx", PROVISIONAL_EXPORT_FIELDS)
            workbook = load_workbook(excel_path)
            worksheet = workbook.active
            header = [cell.value for cell in worksheet[1]]
            first_row = [cell.value for cell in worksheet[2]]
            row = dict(zip(header, first_row, strict=True))

        self.assertEqual(worksheet.max_row, 2)
        self.assertEqual(row["name"], "Muster, Anna")
        self.assertEqual(row["gender"], "w")
        self.assertEqual(str(row["event_100m_obstacle_place"]), "1")
        self.assertEqual(row["event_100m_obstacle_time"], "1:08,88")
        self.assertEqual(str(row["event_100m_obstacle_points"]), "852")
        self.assertEqual(str(row["runde"]), "2")
        self.assertEqual(row["wertung"], "Einzelkampf")


if __name__ == "__main__":
    unittest.main()
