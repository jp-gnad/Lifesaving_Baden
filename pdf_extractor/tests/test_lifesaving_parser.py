from pathlib import Path
import unittest

from lifesaving_pdf_extractor.config import PROVISIONAL_EXPORT_FIELDS
from lifesaving_pdf_extractor.models import DocumentContext, DocumentType, ExtractionStatus, LoadedDocument, LoadedPage, PreprocessedPage
from lifesaving_pdf_extractor.parsers.lifesaving_parser import LifesavingProtocolParser


class LifesavingParserTests(unittest.TestCase):
    def setUp(self) -> None:
        self.parser = LifesavingProtocolParser()

    def test_parses_lms_result_page(self) -> None:
        page_text = """
LMS2025 - EStand: 30.06.2025 19:11:14
JAuswertung (c) Dennis Fabri
Ergebnisse - AK 12 weiblich
Pl  Name                  Gliederung          Q-Gld            Jg  Punkte   Diff 1 2 3
1   Maier, Emma           Malsch              Karlsruhe        13  2300,50  0    0:41,19 754  0:28,93 742  0:37,28 804
2   Wuttke, Selma         Malsch              Karlsruhe        14  2136,77  164  0:45,69 541  0:30,06 698  0:41,32 897
Checksummen: 2023,54 184,23 163,00
50m Kombiniertes Schwimmen (0:37,12) Disziplin 1
50m Flossenschwimmen (0:28,17) Disziplin 2
50m Hindernisschwimmen (0:39,41) Disziplin 3
Albgaubad Hallenbad 29.06.2025
""".strip()

        result = self.parser.parse(
            self._document(page_text, "LMS2025_Ergebnisse_Einzel.pdf"),
            self._context("LMS2025_Ergebnisse_Einzel.pdf"),
            [PreprocessedPage(page_number=1, text=page_text, text_source="pdf_text", used_ocr=False)],
        )

        self.assertEqual(len(result.records), 2)
        self.assertEqual(result.records[0].status, ExtractionStatus.COMPLETE)
        self.assertEqual(result.records[0].data["name"], "Maier, Emma")
        self.assertEqual(result.records[0].data["verein"], "Malsch")
        self.assertEqual(result.records[0].data["altersklasse"], "AK 12")
        self.assertEqual(result.records[0].data["geschlecht"], "weiblich")
        self.assertEqual(result.records[0].data["punkte"], "2300,50")
        self.assertEqual(result.records[0].data["datum"], "29.06.2025")
        self.assertIn("Q-Gld=Karlsruhe", result.records[0].data["bemerkung"])

    def test_parses_bw_masters_result_page(self) -> None:
        page_text = """
Name: Baden-Wuerttembergische Seniorenmeisterschaften im Rettungsschwimmen
Ort: Weingarten (Baden)
Datum: 18.10.2025
bwesen2025 - EStand: 18.10.2025 15:24:33
JAuswertung (c) Dennis Fabri
Ergebnisse - AK 20 weiblich (bwsen)
Pl  Name                  Gliederung                     LV  Jg  Punkte   Diff  1 2 3 4
1   Kuhn, Aurelia         Malsch                         BA  02  2245,49  0     1:17,73 788  0:48,56 685  1:21,05 772
2   Hirsch, Sophie        Oberhausen-Rheinhausen        BA  03  2038,61  207   1:21,94 692  0:52,64 590  1:29,04 757
-   Hoeltge, Elli Charlotte  St. Leon                   BA  04  ...      0     n.a. n.a. n.a.
100m Hindernisschwimmen (1:09,15) Disziplin 1
50m Retten (0:42,39) Disziplin 2
100m Retten mit Flossen (1:07,06) Disziplin 3
100m Lifesaver (1:05,46) Disziplin 4
Weingarten (Baden) 18.10.2025
""".strip()

        result = self.parser.parse(
            self._document(page_text, "bwesen2025_Protokoll_Einzel_BWSen.pdf"),
            self._context("bwesen2025_Protokoll_Einzel_BWSen.pdf"),
            [PreprocessedPage(page_number=1, text=page_text, text_source="pdf_text", used_ocr=False)],
        )

        self.assertEqual(len(result.records), 3)
        self.assertEqual(result.records[0].data["verein"], "Malsch")
        self.assertEqual(result.records[0].data["geschlecht"], "weiblich")
        self.assertEqual(result.records[0].data["datum"], "18.10.2025")
        self.assertIn("LV=BA", result.records[0].data["bemerkung"])
        self.assertIn("100m Lifesaver", result.records[0].data["bemerkung"])
        self.assertEqual(result.records[2].status, ExtractionStatus.PARTIAL)
        self.assertEqual(result.records[2].data["dq_status"], "DNS")

    def test_parses_status_page_entries(self) -> None:
        page_text = """
Strafenliste
bwesen2025-e
Stand: 18.10.2025 15:24:33
Protokoll
Seite 25
Weingarten (Baden) 18.10.2025
JAuswertung (c) Dennis Fabri
AK 45 maennlich, 100m Lifesaver
Fichtner, Arthur, Neckarsulm (WUE)
Lauf 51, Bahn 2
S1: Disqualifikation
AK 20 weiblich, 100m Lifesaver
Hoeltge, Elli Charlotte, St. Leon (BA)
Lauf 48, Bahn 4
Nicht angetreten
""".strip()

        result = self.parser.parse(
            self._document(page_text, "bwesen2025_Protokoll_Einzel_BWSen.pdf"),
            self._context("bwesen2025_Protokoll_Einzel_BWSen.pdf"),
            [PreprocessedPage(page_number=1, text=page_text, text_source="pdf_text", used_ocr=False)],
        )

        self.assertEqual(len(result.records), 2)
        self.assertEqual(result.records[0].data["dq_status"], "DQ")
        self.assertEqual(result.records[0].data["disziplin"], "100m Lifesaver")
        self.assertEqual(result.records[1].data["dq_status"], "DNS")
        self.assertEqual(result.records[1].data["verein"], "St. Leon")

    def test_parses_single_discipline_round_tables_and_ignores_team_events(self) -> None:
        page_text = """
Name: Junioren Rettungspokal 2025
Ort: Bremen
Datum: 28.06.2025
Wettkampf 17 - 100m Hindernisschwimmen
AK 17/18 weiblich
Vorlauf
Pl  Name                  Gliederung              Jg  Lauf Bahn Zeit      Punkte
1   Muster, Anna          Baden                   08  1    4    1:09,34   845
2   Beispiel, Eva         Bayern                  07  2    3    1:10,11   832
A-Finale
Pl  Name                  Gliederung              Jg  Lauf Bahn Zeit      Punkte
1   Muster, Anna          Baden                   08  1    4    1:08,88   852
2   Beispiel, Eva         Bayern                  07  1    5    DNS
Wettkampf 18 - 4x50m Hindernisstaffel
AK 17/18 weiblich
Finale
Pl  Name                  Gliederung              Jg  Zeit       Punkte
1   Team Baden            Baden                   08  1:45,00    900
Wettkampf 19 - Line Throw
AK 17/18 maennlich
Finale
Pl  Name                  Gliederung              Jg  Zeit       Punkte
1   Werfer, Timo          Sachsen                 08  0:15,20    700
""".strip()

        result = self.parser.parse(
            self._document(page_text, "JRP2025-Ergebnisse-Samstag.pdf"),
            self._context("JRP2025-Ergebnisse-Samstag.pdf"),
            [PreprocessedPage(page_number=1, text=page_text, text_source="pdf_text", used_ocr=False)],
        )

        self.assertEqual(len(result.records), 4)
        self.assertTrue(all(record.data["disziplin"] == "100m Hindernisschwimmen" for record in result.records))
        self.assertEqual(result.records[0].data["bemerkung"], "Runde=Vorlauf; Lauf=1; Bahn=4")
        self.assertIn("Runde=A-Finale", result.records[2].data["bemerkung"])
        self.assertEqual(result.records[3].data["dq_status"], "DNS")
        self.assertEqual(result.records[3].status, ExtractionStatus.PARTIAL)

    def test_parses_text_based_bms_summary_page_without_jauswertung_header(self) -> None:
        page_text = """
Name: Badische Meisterschaften Rhein-Neckar
Ort: Eppelheim
Datum: 14.03.2025
AK 10 weiblich
Pl Name Gliederung Jg Punkte Diff 50m k. Schwimmen 50m k. Schwimmen Zeit 50m k. Schwimmen Pkt 50m k. Schwimmen Str 50m Freistil 50m Freistil Zeit 50m Freistil Pkt 50m Freistil Str 50m Hindernis 50m Hindernis Zeit 50m Hindernis Pkt 50m Hindernis Str
1   Zube, Nea              Waibstadt        15  2861,65  0   0:39,12 754 0   0:36,11 987 0   0:38,20 1120 0
""".strip()

        result = self.parser.parse(
            self._document(page_text, "BMS2025_Ergebnisse_RN_Einzel.pdf"),
            self._context("BMS2025_Ergebnisse_RN_Einzel.pdf"),
            [PreprocessedPage(page_number=1, text=page_text, text_source="pdf_text", used_ocr=False)],
        )

        self.assertEqual(len(result.records), 1)
        self.assertEqual(result.records[0].data["disziplin"], "Einzelwertung")
        self.assertEqual(result.records[0].data["name"], "Zube, Nea")
        self.assertEqual(result.records[0].data["verein"], "Waibstadt")
        self.assertEqual(result.records[0].data["geschlecht"], "weiblich")
        self.assertEqual(
            result.records[0].data["summary_discipline_keys"],
            "event_50m_combined_swim|event_50m_freestyle|event_50m_obstacle",
        )
        self.assertEqual(result.records[0].data["summary_discipline_count"], "3")
        self.assertEqual(result.records[0].data["summary_disciplines"], "50m k. Schwimmen|50m Freistil|50m Hindernis")
        self.assertIn("50m k. Schwimmen", result.records[0].data["bemerkung"])
        self.assertIn("50m Freistil", result.records[0].data["bemerkung"])
        self.assertNotIn("LV=", result.records[0].data["bemerkung"])

    def test_normalizes_mojibake_and_non_breaking_spaces_in_text_based_rows(self) -> None:
        nbsp = "\u00a0"
        page_text = (
            "Name: Badische Meisterschaften Frankenland\n"
            "Ort: K\u00c3\u00b6nigheim\n"
            "Datum: 14.03.2025\n"
            "AK 10 maennlich\n"
            "Pl  Name  Gliederung  Jg  Punkte  Diff  50m k. Schwimmen 50m k. Schwimmen Zeit 50m k. Schwimmen Pkt 50m k. Schwimmen Str\n"
            f"5\u00c2{nbsp}\u00c2{nbsp}Fleuchaus,\u00c2{nbsp}Kilian\u00c2{nbsp}\u00c2{nbsp}Tauberbischofsheim"
            f"\u00c2{nbsp}\u00c2{nbsp}15\u00c2{nbsp}\u00c2{nbsp}1028,95\u00c2{nbsp}\u00c2{nbsp}1201"
            f"\u00c2{nbsp}\u00c2{nbsp}0:32,01\u00c2{nbsp}\u00c2{nbsp}S1:\u00c2{nbsp}disq."
        )

        result = self.parser.parse(
            self._document(page_text, "Ergebnisse_Einzel.pdf"),
            self._context("Ergebnisse_Einzel.pdf"),
            [PreprocessedPage(page_number=1, text=page_text, text_source="pdf_text", used_ocr=False)],
        )

        self.assertEqual(len(result.records), 1)
        self.assertEqual(result.records[0].data["name"], "Fleuchaus, Kilian")
        self.assertEqual(result.records[0].data["verein"], "Tauberbischofsheim")
        self.assertEqual(result.records[0].data["datum"], "14.03.2025")
        self.assertEqual(result.records[0].data["ort"], "K\u00f6nigheim")
        self.assertEqual(result.records[0].data["dq_status"], "DQ")

    def test_detects_multiple_disciplines_from_compact_header_signature(self) -> None:
        page_text = """
Name: Badische Meisterschaften Frankenland
Ort: Wallduern
Datum: 14.03.2025
AK 12 weiblich
Pl Name Gliederung Jg Punkte Diff 50m k. Schwim 50m k. Schwim Zeit 50m k. Schwim Pkt Str50m Flossen50m Flossen Zeit50m Flossen Pkt Str50m Hindernis50m HindernisZeit50m HindernisPktStr
1   Beispiel, Nina        Adelsheim        13  1498,19  0   0:35,61 613 0   0:28,10 854 0   0:38,11 644 0
""".strip()

        result = self.parser.parse(
            self._document(page_text, "Ergebnisse_Einzel.pdf"),
            self._context("Ergebnisse_Einzel.pdf"),
            [PreprocessedPage(page_number=1, text=page_text, text_source="pdf_text", used_ocr=False)],
        )

        self.assertEqual(len(result.records), 1)
        self.assertEqual(
            result.records[0].data["summary_discipline_keys"],
            "event_50m_combined_swim|event_50m_finswim|event_50m_obstacle",
        )
        self.assertEqual(result.records[0].data["summary_discipline_count"], "3")

    def test_prefers_split_footer_discipline_index_lines_for_summary_pages(self) -> None:
        page_text = """
Name: LMS Beispiel
Ort: Karlsruhe
Datum: 29.06.2025
50m Kombiniertes Schwimmen (0:37,12)
Disziplin 1
50m Flossenschwimmen (0:28,17)
Disziplin 2
50m Hindernisschwimmen (0:39,41)
Disziplin 3
Pl Name Gliederung Jg Punkte Diff
1   Maier, Emma           Malsch        13  2300,50  0   0:41,19 754 0:28,93 742 0:37,28 804
""".strip()

        result = self.parser.parse(
            self._document(page_text, "LMS2025_Ergebnisse_Einzel.pdf"),
            self._context("LMS2025_Ergebnisse_Einzel.pdf"),
            [PreprocessedPage(page_number=1, text=page_text, text_source="pdf_text", used_ocr=False)],
        )

        self.assertEqual(len(result.records), 1)
        self.assertEqual(
            result.records[0].data["summary_discipline_keys"],
            "event_50m_combined_swim|event_50m_finswim|event_50m_obstacle",
        )
        self.assertEqual(result.records[0].data["summary_discipline_count"], "3")

    @staticmethod
    def _document(page_text: str, filename: str) -> LoadedDocument:
        return LoadedDocument(
            path=Path(filename),
            page_count=1,
            metadata={},
            pages=[LoadedPage(number=1, rotation=0, extracted_text=page_text, image_count=0)],
        )

    @staticmethod
    def _context(filename: str) -> DocumentContext:
        return DocumentContext(
            source_path=Path(filename),
            document_type=DocumentType.LIFESAVING,
            metadata={},
            page_analyses=[],
            provisional_fields=PROVISIONAL_EXPORT_FIELDS,
            parser_name="lifesaving",
        )


if __name__ == "__main__":
    unittest.main()
