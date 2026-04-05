from pathlib import Path
import unittest

from lifesaving_pdf_extractor.config import PROVISIONAL_EXPORT_FIELDS
from lifesaving_pdf_extractor.models import ExtractedRecord, ExtractionStatus
from lifesaving_pdf_extractor.normalize import ProtocolNormalizer


class NormalizerTests(unittest.TestCase):
    def test_normalizes_provisional_values(self) -> None:
        record = ExtractedRecord(
            source_file=Path("demo.pdf"),
            page_number=1,
            parser_name="generic",
            status=ExtractionStatus.PARTIAL,
            confidence=0.3,
            data={
                "datum": "05.04.2026",
                "zeit": "1:02,3",
                "dq_status": "dsq",
            },
        )

        normalized = ProtocolNormalizer().normalize_record(record, PROVISIONAL_EXPORT_FIELDS)

        self.assertEqual(normalized.data["datum"], "2026-04-05")
        self.assertEqual(normalized.data["zeit"], "00:01:02.30")
        self.assertEqual(normalized.data["dq_status"], "DQ")


if __name__ == "__main__":
    unittest.main()
