from __future__ import annotations

import re
from dataclasses import dataclass

from ..models import DocumentContext, ExtractionStatus, LoadedDocument, ParserResult, PreprocessedPage
from .base_parser import BaseProtocolParser


@dataclass(slots=True)
class ParsedResultRow:
    place: str
    name: str
    club: str
    qualifier: str
    year: str
    points: str
    diff: str
    tail: str = ""


@dataclass(slots=True)
class ParsedIndividualRow:
    place: str
    name: str
    club: str
    year: str
    heat: str = ""
    lane: str = ""
    time: str = ""
    points: str = ""


class LifesavingProtocolParser(BaseProtocolParser):
    """Parser for text-based lifesaving result protocols."""

    name = "lifesaving"

    _RESULT_ROW_PATTERNS = (
        re.compile(
            r"^(?P<place>\d+|-)\s+(?P<name>.+?)\s{2,}(?P<club>.+?)\s{2,}"
            r"(?P<qualifier>.+?)\s{2,}(?P<year>\d{2,4})\s+"
            r"(?P<points>\.\.\.|n\.a\.|[\d.,]+)\s+(?P<diff>[-\d.,]+)\s*(?P<tail>.*)$"
        ),
        re.compile(
            r"^(?P<place>\d+|-)\s+(?P<name>.+?)\s{2,}(?P<club>.+?)\s{2,}"
            r"(?P<year>\d{2,4})\s+(?P<points>\.\.\.|n\.a\.|[\d.,]+)\s+"
            r"(?P<diff>[-\d.,]+)\s*(?P<tail>.*)$"
        ),
    )
    _INDIVIDUAL_ROW_PATTERNS = (
        re.compile(
            r"^(?P<place>\d+|-)\s+(?P<name>.+?)\s{2,}(?P<club>.+?)\s{2,}"
            r"(?P<year>\d{2,4})\s+(?P<heat>\d+)\s+(?P<lane>\d+)\s+"
            r"(?P<time>[0-9:.,]+|DNS|DQ|DNF|n\.a\.)\s*(?P<points>[\d.,]+)?$",
            flags=re.IGNORECASE,
        ),
        re.compile(
            r"^(?P<place>\d+|-)\s+(?P<name>.+?)\s{2,}(?P<club>.+?)\s{2,}"
            r"(?P<year>\d{2,4})\s+(?P<time>[0-9:.,]+|DNS|DQ|DNF|n\.a\.)\s*(?P<points>[\d.,]+)?$",
            flags=re.IGNORECASE,
        ),
    )
    _ROUND_TITLES = {
        "vorlauf": "Vorlauf",
        "halbfinale": "Halbfinale",
        "finale": "Finale",
        "endlauf": "Endlauf",
        "zeitlauf": "Zeitlauf",
        "a-finale": "A-Finale",
        "a finale": "A-Finale",
        "b-finale": "B-Finale",
        "b finale": "B-Finale",
        "c-finale": "C-Finale",
        "c finale": "C-Finale",
    }

    def parse(
        self,
        document: LoadedDocument,
        context: DocumentContext,
        pages: list[PreprocessedPage],
    ) -> ParserResult:
        metadata = self._extract_common_metadata(document, pages)
        records = []

        for page in pages:
            page_text = page.text.strip()
            if not page_text:
                continue

            if self._is_status_page(page_text):
                records.extend(self._parse_status_page(document, context, page.page_number, page_text, metadata))
                continue

            if self._contains_individual_event_sections(page_text):
                records.extend(self._parse_individual_event_page(document, context, page.page_number, page_text, metadata))
                continue

            if self._is_result_page(page_text):
                records.extend(self._parse_result_page(document, context, page.page_number, page_text, metadata))

        return ParserResult(records=records, review_flags=[])

    def _is_result_page(self, page_text: str) -> bool:
        canonical = self._canonical(page_text)
        if "jauswertung" in canonical and "ergebnisse - ak" in canonical:
            return True

        return bool(
            re.search(
                r"^Pl\s+Name\s+(?:Gliederung|Gld)\s+(?:Q-Gld\s+|LV\s+)?Jg\s+Punkte\s+Diff\b",
                page_text,
                flags=re.IGNORECASE | re.MULTILINE,
            )
        )

    def _is_status_page(self, page_text: str) -> bool:
        canonical = self._canonical(page_text)
        return "strafenliste" in canonical or "nicht angetreten" in canonical

    def _contains_individual_event_sections(self, page_text: str) -> bool:
        return bool(re.search(r"^Wettkampf\s+[A-Za-z0-9/-]+\s*[-:]", page_text, flags=re.IGNORECASE | re.MULTILINE))

    def _extract_common_metadata(
        self,
        document: LoadedDocument,
        pages: list[PreprocessedPage],
    ) -> dict[str, str]:
        metadata = self.extract_document_header(pages)
        combined_text = "\n".join(page.text for page in pages if page.text)

        named_title = self._extract_labeled_value(combined_text, "Name")
        if named_title:
            metadata["wettkampfname"] = named_title
        elif not metadata.get("wettkampfname"):
            metadata["wettkampfname"] = document.path.stem

        named_date = self._extract_labeled_value(combined_text, "Datum")
        if named_date:
            metadata["datum"] = named_date

        named_location = self._extract_labeled_value(combined_text, "Ort")
        if named_location:
            metadata["ort"] = named_location

        if not metadata.get("ort") or not metadata.get("datum"):
            footer_location, footer_date = self._extract_footer_location_and_date(combined_text)
            if footer_location and not metadata.get("ort"):
                metadata["ort"] = footer_location
            if footer_date and not metadata.get("datum"):
                metadata["datum"] = footer_date

        return metadata

    def _parse_result_page(
        self,
        document: LoadedDocument,
        context: DocumentContext,
        page_number: int,
        page_text: str,
        metadata: dict[str, str],
    ) -> list:
        records = []
        category, gender = self._extract_page_category(page_text)
        disciplines = self._extract_result_disciplines(page_text)
        qualifier_label = "Q-Gld" if "q-gld" in self._canonical(page_text) else "LV"

        for line in page_text.splitlines():
            row = self._parse_result_row(line.strip())
            if row is None:
                continue

            dq_status = self._derive_status(" ".join((row.points, row.tail)))
            data = self.build_base_payload(context)
            data.update(metadata)
            data.update(
                {
                    "disziplin": "Einzelwertung",
                    "altersklasse": category,
                    "geschlecht": gender,
                    "platz": row.place,
                    "name": row.name,
                    "jahrgang": row.year,
                    "verein": row.club,
                    "punkte": row.points if self._is_numeric_value(row.points) else "",
                    "bemerkung": self._build_result_remarks(row, qualifier_label, disciplines),
                    "dq_status": dq_status,
                }
            )

            record_status = ExtractionStatus.COMPLETE
            confidence = 0.9
            review_notes: list[str] = []

            if dq_status:
                record_status = ExtractionStatus.PARTIAL
                confidence = 0.7
                review_notes.append(f"Status aus Ergebniszeile abgeleitet: {dq_status}")
            elif not self._is_numeric_value(row.points):
                record_status = ExtractionStatus.PARTIAL
                confidence = 0.65
                review_notes.append("Punkte konnten nicht sicher gelesen werden")

            records.append(
                self.build_record(
                    document=document,
                    context=context,
                    page_number=page_number,
                    data=data,
                    status=record_status,
                    confidence=confidence,
                    review_notes=review_notes,
                    raw_excerpt=line.strip(),
                )
            )

        return records

    def _parse_status_page(
        self,
        document: LoadedDocument,
        context: DocumentContext,
        page_number: int,
        page_text: str,
        metadata: dict[str, str],
    ) -> list:
        lines = [line.strip() for line in page_text.splitlines() if line.strip()]
        records = []
        index = 0

        while index < len(lines):
            category, gender, discipline = self._parse_status_header(lines[index])
            if not category and not discipline:
                index += 1
                continue

            person_line = lines[index + 1] if index + 1 < len(lines) else ""
            lane_line = lines[index + 2] if index + 2 < len(lines) else ""
            status_line = lines[index + 3] if index + 3 < len(lines) else ""

            name, club, qualifier = self._parse_status_person(person_line)
            dq_status = self._derive_status(status_line)
            if not name or not dq_status:
                index += 1
                continue

            data = self.build_base_payload(context)
            data.update(metadata)
            data.update(
                {
                    "disziplin": discipline,
                    "altersklasse": category,
                    "geschlecht": gender,
                    "name": name,
                    "verein": club,
                    "bemerkung": self._build_status_remarks(qualifier, lane_line, status_line),
                    "dq_status": dq_status,
                }
            )

            records.append(
                self.build_record(
                    document=document,
                    context=context,
                    page_number=page_number,
                    data=data,
                    status=ExtractionStatus.PARTIAL,
                    confidence=0.74,
                    review_notes=[f"Statusseite erkannt: {dq_status}"],
                    raw_excerpt="\n".join((lines[index], person_line, lane_line, status_line)).strip(),
                )
            )
            index += 4

        return records

    def _parse_individual_event_page(
        self,
        document: LoadedDocument,
        context: DocumentContext,
        page_number: int,
        page_text: str,
        metadata: dict[str, str],
    ) -> list:
        lines = [line.strip() for line in page_text.splitlines() if line.strip()]
        records = []
        section_starts = [idx for idx, line in enumerate(lines) if re.match(r"^Wettkampf\s+[A-Za-z0-9/-]+\s*[-:]", line, flags=re.IGNORECASE)]

        for offset, start in enumerate(section_starts):
            end = section_starts[offset + 1] if offset + 1 < len(section_starts) else len(lines)
            section_lines = lines[start:end]
            header_match = re.match(
                r"^Wettkampf\s+(?P<number>[A-Za-z0-9/-]+)\s*[-:]\s*(?P<discipline>.+)$",
                section_lines[0],
                flags=re.IGNORECASE,
            )
            if not header_match:
                continue

            event_number = header_match.group("number").strip()
            discipline = header_match.group("discipline").strip()
            if self._should_ignore_discipline(discipline):
                continue

            category, gender = self._extract_section_category(section_lines)
            current_round = ""

            for line in section_lines[1:]:
                if self._looks_like_round_heading(line):
                    current_round = self._normalize_round_name(line)
                    continue
                if self._is_table_header(line):
                    continue
                if line.startswith("AK "):
                    continue

                row = self._parse_individual_row(line)
                if row is None:
                    continue

                dq_status = self._derive_status(row.time)
                data = self.build_base_payload(context)
                data.update(metadata)
                data.update(
                    {
                        "wettkampfnummer": event_number,
                        "disziplin": discipline,
                        "altersklasse": category,
                        "geschlecht": gender,
                        "platz": row.place,
                        "name": row.name,
                        "jahrgang": row.year,
                        "verein": row.club,
                        "zeit": "" if dq_status else row.time,
                        "punkte": row.points,
                        "bemerkung": self._build_individual_remarks(current_round, row),
                        "dq_status": dq_status,
                    }
                )

                record_status = ExtractionStatus.PARTIAL if dq_status else ExtractionStatus.COMPLETE
                confidence = 0.72 if dq_status else 0.9
                review_notes = [f"Status aus Streckentabelle abgeleitet: {dq_status}"] if dq_status else []

                records.append(
                    self.build_record(
                        document=document,
                        context=context,
                        page_number=page_number,
                        data=data,
                        status=record_status,
                        confidence=confidence,
                        review_notes=review_notes,
                        raw_excerpt=line,
                    )
                )

        return records

    def _parse_result_row(self, line: str) -> ParsedResultRow | None:
        for pattern in self._RESULT_ROW_PATTERNS:
            match = pattern.match(line)
            if not match:
                continue
            groups = match.groupdict(default="")
            return ParsedResultRow(
                place=groups.get("place", "").strip(),
                name=groups.get("name", "").strip(),
                club=groups.get("club", "").strip(),
                qualifier=groups.get("qualifier", "").strip(),
                year=groups.get("year", "").strip(),
                points=groups.get("points", "").strip(),
                diff=groups.get("diff", "").strip(),
                tail=groups.get("tail", "").strip(),
            )
        return None

    def _parse_individual_row(self, line: str) -> ParsedIndividualRow | None:
        for pattern in self._INDIVIDUAL_ROW_PATTERNS:
            match = pattern.match(line)
            if not match:
                continue
            groups = match.groupdict(default="")
            return ParsedIndividualRow(
                place=groups.get("place", "").strip(),
                name=groups.get("name", "").strip(),
                club=groups.get("club", "").strip(),
                year=groups.get("year", "").strip(),
                heat=groups.get("heat", "").strip(),
                lane=groups.get("lane", "").strip(),
                time=groups.get("time", "").strip(),
                points=groups.get("points", "").strip(),
            )
        return None

    def _extract_page_category(self, page_text: str) -> tuple[str, str]:
        for line in page_text.splitlines():
            stripped = line.strip()
            if "AK" not in stripped:
                continue
            if "Ergebnisse -" in stripped:
                stripped = stripped.split("Ergebnisse -", maxsplit=1)[1].strip()
            category, gender = self._parse_category_from_line(stripped)
            if category or gender:
                return category, gender
        return "", ""

    def _extract_section_category(self, section_lines: list[str]) -> tuple[str, str]:
        for line in section_lines:
            category, gender = self._parse_category_from_line(line)
            if category or gender:
                return category, gender
        return "", ""

    def _extract_result_disciplines(self, page_text: str) -> list[str]:
        disciplines: list[str] = []
        for line in page_text.splitlines():
            match = re.match(r"^(?P<name>.+?)\s+\([^)]+\)\s+Disziplin\s+\d+\s*$", line.strip(), flags=re.IGNORECASE)
            if match:
                disciplines.append(match.group("name").strip())
        if disciplines:
            return disciplines

        seen: set[str] = set()
        for match in re.finditer(
            r"(?P<name>\d{2,3}m\s+.+?)\s+Zeit\b",
            page_text,
            flags=re.IGNORECASE,
        ):
            candidate = self._dedupe_repeated_label(match.group("name").strip())
            canonical = self._canonical(candidate)
            if canonical in seen:
                continue
            seen.add(canonical)
            disciplines.append(candidate)
        return disciplines

    def _build_result_remarks(self, row: ParsedResultRow, qualifier_label: str, disciplines: list[str]) -> str:
        parts: list[str] = []
        if row.qualifier:
            parts.append(f"{qualifier_label}={row.qualifier}")
        if row.diff:
            parts.append(f"Diff={row.diff}")
        if disciplines:
            parts.append("Disziplinen=" + " | ".join(disciplines))
        return "; ".join(parts)

    def _build_individual_remarks(self, round_name: str, row: ParsedIndividualRow) -> str:
        parts: list[str] = []
        if round_name:
            parts.append(f"Runde={round_name}")
        if row.heat:
            parts.append(f"Lauf={row.heat}")
        if row.lane:
            parts.append(f"Bahn={row.lane}")
        return "; ".join(parts)

    def _derive_status(self, value: str) -> str:
        canonical = self._canonical(value)
        if not canonical:
            return ""
        if "nicht angetreten" in canonical or re.search(r"\bdns\b", canonical):
            return "DNS"
        if "disqual" in canonical or re.search(r"\bdq\b|\bdsq\b|\bs\d+\b", canonical):
            return "DQ"
        if re.search(r"\bdnf\b", canonical):
            return "DNF"
        if "n.a." in canonical or "..." in value:
            return "DNS"
        return ""

    def _should_ignore_discipline(self, discipline: str) -> bool:
        canonical = self._canonical(discipline)
        ignore_fragments = (
            "4x",
            "4 x",
            "staffel",
            "relay",
            "line throw",
            "linethrow",
            "line-trow",
            "leinenwurf",
        )
        return any(fragment in canonical for fragment in ignore_fragments)

    def _extract_footer_location_and_date(self, value: str) -> tuple[str, str]:
        for line in reversed([item.strip() for item in value.splitlines() if item.strip()]):
            match = re.match(
                r"^(?P<location>.+?)\s+(?P<date>\d{1,2}[./-]\d{1,2}[./-]\d{4})$",
                line,
            )
            if match:
                return match.group("location").strip(), match.group("date").strip()
        return "", ""

    def _dedupe_repeated_label(self, value: str) -> str:
        words = value.split()
        if len(words) % 2 == 0:
            half = len(words) // 2
            left = " ".join(words[:half])
            right = " ".join(words[half:])
            if self._canonical(left) == self._canonical(right):
                return left
        return value

    @staticmethod
    def _is_numeric_value(value: str) -> bool:
        return bool(re.fullmatch(r"[\d.,]+", value.strip()))

    def _parse_category_from_line(self, line: str) -> tuple[str, str]:
        cleaned = re.sub(r"\s*\([^)]*\)\s*$", "", line.strip())
        match = re.match(
            r"^(?P<category>AK\s+.+?)\s+(?P<gender>weiblich|maennlich|m\Snnlich|mixed)\b",
            cleaned,
            flags=re.IGNORECASE,
        )
        if match:
            gender = self._canonical(match.group("gender"))
            gender = "maennlich" if gender.startswith("maennlich") else gender
            return match.group("category").strip().rstrip(",;"), gender

        if self._canonical(cleaned).startswith("ak "):
            return cleaned.strip().rstrip(",;"), ""
        return "", ""

    @staticmethod
    def _is_table_header(line: str) -> bool:
        stripped = line.strip().lower()
        return stripped.startswith("pl ") or stripped.startswith("pl\t") or " name " in f" {stripped} "

    def _looks_like_round_heading(self, line: str) -> bool:
        canonical = self._canonical(line)
        return canonical in self._ROUND_TITLES

    def _normalize_round_name(self, line: str) -> str:
        canonical = self._canonical(line)
        return self._ROUND_TITLES.get(canonical, line.strip())

    def _parse_status_header(self, line: str) -> tuple[str, str, str]:
        match = re.match(r"^(?P<header>AK\s+.+?),(?P<discipline>.+)$", line.strip(), flags=re.IGNORECASE)
        if not match:
            return "", "", ""
        category, gender = self._parse_category_from_line(match.group("header").strip())
        discipline = match.group("discipline").strip()
        return category, gender, discipline

    @staticmethod
    def _parse_status_person(line: str) -> tuple[str, str, str]:
        match = re.match(
            r"^(?P<name>.+?,.+?),\s+(?P<club>.+?)\s+\((?P<qualifier>[^)]+)\)\s*$",
            line.strip(),
        )
        if not match:
            return "", "", ""
        return (
            match.group("name").strip(),
            match.group("club").strip(),
            match.group("qualifier").strip(),
        )

    @staticmethod
    def _build_status_remarks(qualifier: str, lane_line: str, status_line: str) -> str:
        parts: list[str] = []
        if qualifier:
            parts.append(f"LV={qualifier}")
        if lane_line:
            parts.append(lane_line.strip())
        if status_line and not re.search(r"nicht angetreten", status_line, flags=re.IGNORECASE):
            parts.append(status_line.strip())
        return "; ".join(parts)

    @staticmethod
    def _extract_labeled_value(value: str, label: str) -> str:
        pattern = re.compile(rf"^{re.escape(label)}\s*:\s*(?P<content>.+)$", flags=re.IGNORECASE | re.MULTILINE)
        match = pattern.search(value)
        return match.group("content").strip() if match else ""

    @staticmethod
    def _canonical(value: str) -> str:
        normalized = (
            value.replace("\u00e4", "ae")
            .replace("\u00f6", "oe")
            .replace("\u00fc", "ue")
            .replace("\u00c4", "ae")
            .replace("\u00d6", "oe")
            .replace("\u00dc", "ue")
            .replace("\u00df", "ss")
            .lower()
        )
        return re.sub(r"\s+", " ", normalized).strip()
