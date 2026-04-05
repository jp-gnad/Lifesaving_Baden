from __future__ import annotations

import re
from dataclasses import replace

from .models import ExtractedRecord


class ProtocolNormalizer:
    """Normalize provisional values while keeping unknown data explicit."""

    def normalize_record(self, record: ExtractedRecord, provisional_fields: tuple[str, ...]) -> ExtractedRecord:
        normalized_data: dict[str, str] = {}
        review_notes = list(record.review_notes)

        for field in provisional_fields:
            value = self._clean_text(record.data.get(field, ""))
            if field == "zeit":
                value = self._normalize_time(value)
            elif field == "datum":
                value = self._normalize_date(value)
            elif field == "dq_status":
                value = self._normalize_dq_status(value)
            normalized_data[field] = value

        return replace(record, data=normalized_data, review_notes=review_notes)

    @staticmethod
    def _clean_text(value: str) -> str:
        return re.sub(r"\s+", " ", value).strip()

    def _normalize_time(self, value: str) -> str:
        if not value:
            return ""

        cleaned = value.replace(" ", "").replace(",", ".")
        cleaned = cleaned.removesuffix(".")

        if cleaned.upper() in {"DQ", "DSQ", "DNS", "DNF"}:
            return ""

        match = re.fullmatch(r"(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,2}))?", cleaned)
        if match:
            hours = int(match.group(1))
            minutes = int(match.group(2))
            seconds = int(match.group(3))
            fraction = (match.group(4) or "00").ljust(2, "0")[:2]
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{fraction}"

        match = re.fullmatch(r"(\d{1,2}):(\d{2})(?:\.(\d{1,2}))?", cleaned)
        if match:
            minutes = int(match.group(1))
            seconds = int(match.group(2))
            fraction = (match.group(3) or "00").ljust(2, "0")[:2]
            return f"00:{minutes:02d}:{seconds:02d}.{fraction}"

        match = re.fullmatch(r"(\d{1,3})(?:\.(\d{1,2}))?", cleaned)
        if match:
            seconds = int(match.group(1))
            fraction = (match.group(2) or "00").ljust(2, "0")[:2]
            return f"00:00:{seconds:02d}.{fraction}"

        return value

    def _normalize_date(self, value: str) -> str:
        if not value:
            return ""

        for pattern in (
            r"(?P<day>\d{1,2})[./-](?P<month>\d{1,2})[./-](?P<year>\d{4})",
            r"(?P<year>\d{4})[./-](?P<month>\d{1,2})[./-](?P<day>\d{1,2})",
        ):
            match = re.fullmatch(pattern, value)
            if match:
                year = int(match.group("year"))
                month = int(match.group("month"))
                day = int(match.group("day"))
                return f"{year:04d}-{month:02d}-{day:02d}"

        return value

    def _normalize_dq_status(self, value: str) -> str:
        if not value:
            return ""

        normalized = value.casefold()
        mapping = {
            "dq": "DQ",
            "dsq": "DQ",
            "disq": "DQ",
            "disqualifiziert": "DQ",
            "disqualified": "DQ",
            "dns": "DNS",
            "dnf": "DNF",
        }
        return mapping.get(normalized, value.upper())
