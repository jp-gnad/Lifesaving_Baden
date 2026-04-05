from pathlib import Path
import unittest

from lifesaving_pdf_extractor.classifier import DocumentClassifier
from lifesaving_pdf_extractor.config import PROVISIONAL_EXPORT_FIELDS
from lifesaving_pdf_extractor.models import DocumentType, LoadedDocument, LoadedPage, PageContentType


class DocumentClassifierTests(unittest.TestCase):
    def test_lifesaving_keywords_select_lifesaving_parser_hint(self) -> None:
        document = LoadedDocument(
            path=Path("lifesaving.pdf"),
            page_count=1,
            metadata={"title": "DLRG Landesmeisterschaft"},
            pages=[
                LoadedPage(
                    number=1,
                    rotation=0,
                    extracted_text="Hindernis Manikin Rescue Super Lifesaver",
                    image_count=0,
                )
            ],
        )

        context = DocumentClassifier().build_context(document, PROVISIONAL_EXPORT_FIELDS)

        self.assertEqual(context.document_type, DocumentType.LIFESAVING)
        self.assertEqual(context.page_analyses[0].content_type, PageContentType.TEXT)


if __name__ == "__main__":
    unittest.main()
