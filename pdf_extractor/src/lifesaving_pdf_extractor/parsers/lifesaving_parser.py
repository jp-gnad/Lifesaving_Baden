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
    _SUMMARY_DISCIPLINE_LABELS: dict[str, str] = {
        "event_100m_lifesaver": "100m Lifesaver",
        "event_50m_manikin_carry": "50m Retten",
        "event_200m_super_lifesaver": "200m Super-Lifesaver",
        "event_100m_rescue_medley": "100m Kombi",
        "event_100m_manikin_carry_with_fins": "100m Retten mit Flossen",
        "event_200m_obstacle": "200m Hindernis",
        "event_100m_obstacle": "100m Hindernis",
        "event_50m_manikin_carry_with_fins": "50m Retten mit Flossen",
        "event_50m_finswim": "50m Flossen",
        "event_50m_obstacle": "50m Hindernis",
        "event_50m_combined_swim": "50m k. Schwimmen",
        "event_50m_freestyle": "50m Freistil",
        "event_25m_freestyle": "25m Freistil",
        "event_25m_breaststroke": "25m Brust",
        "event_25m_backstroke_no_arms": "25m Ruecken ohne Arme",
        "event_25m_manikin": "25m Puppe",
    }
    _SUMMARY_DISCIPLINE_ALIASES: dict[str, tuple[str, ...]] = {
        "event_100m_lifesaver": (
            "100m lifesaver",
            "100m retten mit gurt und flossen",
            "100m manikin tow with fins",
        ),
        "event_50m_manikin_carry": ("50m retten", "50m manikin carry"),
        "event_200m_super_lifesaver": ("200m super-lifesaver", "200m super lifesaver", "200m superlifesaver"),
        "event_100m_rescue_medley": ("100m kombi", "kombinierte rettungsuebung", "100m rescue medley"),
        "event_100m_manikin_carry_with_fins": (
            "100m retten mit flossen",
            "100m retten m fl",
            "100m manikin carry with fins",
        ),
        "event_200m_obstacle": ("200m hindernis", "200m hindernisschwimmen", "200m obstacle swim"),
        "event_100m_obstacle": ("100m hindernis", "100m hindernisschwimmen", "100m obstacle swim"),
        "event_50m_manikin_carry_with_fins": ("50m retten mit flossen", "50m retten m fl"),
        "event_50m_finswim": ("50m flossen", "50m flossenschwimmen"),
        "event_50m_obstacle": ("50m hindernis", "50m hindernisschwimmen"),
        "event_50m_combined_swim": ("50m k schwimmen", "50m kombiniertes schwimmen", "50m k schwimm"),
        "event_50m_freestyle": ("50m freistil", "50m kraul"),
        "event_25m_freestyle": ("25m freistil", "25m kraul"),
        "event_25m_breaststroke": ("25m brust",),
        "event_25m_backstroke_no_arms": (
            "25m ruecken ohne arme",
            "25m rue ohne arme",
            "25m rue. ohne arme",
        ),
        "event_25m_manikin": ("25m puppe",),
    }

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
            page_text = self._normalize_page_text(page.text).strip()
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
        combined_text = "\n".join(self._normalize_page_text(page.text) for page in pages if page.text)

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
        discipline_keys = self._extract_result_discipline_keys(page_text)
        disciplines = [self._SUMMARY_DISCIPLINE_LABELS[key] for key in discipline_keys if key in self._SUMMARY_DISCIPLINE_LABELS]
        has_qualifier_column = self._result_page_has_qualifier_column(page_text)
        qualifier_label = "Q-Gld" if "q-gld" in self._canonical(page_text) else ("LV" if has_qualifier_column else "")

        for line in page_text.splitlines():
            cleaned_line = self._normalize_layout_line(line)
            row = self._parse_result_row(cleaned_line, has_qualifier_column=has_qualifier_column)
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
                    "summary_disciplines": "|".join(disciplines),
                    "summary_discipline_keys": "|".join(discipline_keys),
                    "summary_discipline_count": str(len(discipline_keys)) if discipline_keys else "",
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
                    raw_excerpt=cleaned_line,
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
                cleaned_line = self._normalize_layout_line(line)
                if self._looks_like_round_heading(cleaned_line):
                    current_round = self._normalize_round_name(cleaned_line)
                    continue
                if self._is_table_header(cleaned_line):
                    continue
                if cleaned_line.startswith("AK "):
                    continue

                row = self._parse_individual_row(cleaned_line)
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
                        raw_excerpt=cleaned_line,
                    )
                )

        return records

    def _parse_result_row(self, line: str, has_qualifier_column: bool) -> ParsedResultRow | None:
        line = self._normalize_layout_line(line)
        patterns = self._RESULT_ROW_PATTERNS if has_qualifier_column else (self._RESULT_ROW_PATTERNS[1],)

        for pattern in patterns:
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
        line = self._normalize_layout_line(line)
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

    def _extract_result_discipline_keys(self, page_text: str) -> list[str]:
        footer_disciplines: dict[int, str] = {}
        lines = [self._normalize_layout_line(line) for line in page_text.splitlines() if line.strip()]

        for index, cleaned_line in enumerate(lines):
            match = re.match(
                r"^(?P<name>.+?)\s+\([^)]+\)\s+Disziplin\s+(?P<index>\d+)\s*$",
                cleaned_line,
                flags=re.IGNORECASE,
            )
            if match:
                key = self._summary_discipline_key(match.group("name").strip())
                if key is None:
                    continue
                footer_disciplines[int(match.group("index"))] = key
                continue

            inline_number_match = re.match(r"^Disziplin\s+(?P<index>\d+)\s*$", cleaned_line, flags=re.IGNORECASE)
            if not inline_number_match or index == 0:
                continue

            key = self._summary_discipline_key(lines[index - 1])
            if key is None:
                continue
            footer_disciplines[int(inline_number_match.group("index"))] = key

        if footer_disciplines:
            return [footer_disciplines[index] for index in sorted(footer_disciplines)]

        header_block = self._extract_result_header_block(page_text)
        if not header_block:
            return []

        signature = self._discipline_signature(header_block)
        candidates: list[tuple[int, str, int]] = []
        for key, aliases in self._SUMMARY_DISCIPLINE_ALIASES.items():
            for alias in aliases:
                alias_signature = self._discipline_signature(alias)
                if not alias_signature:
                    continue
                start = 0
                while True:
                    position = signature.find(alias_signature, start)
                    if position < 0:
                        break
                    candidates.append((position, key, len(alias_signature)))
                    start = position + 1

        candidates.sort(key=lambda item: (item[0], -item[2]))
        ordered_keys: list[tuple[int, str]] = []
        seen_keys: set[str] = set()
        for position, key, alias_length in candidates:
            if key in seen_keys:
                continue
            if ordered_keys and ordered_keys[-1][0] == position:
                continue
            if ordered_keys and ordered_keys[-1][1] == key and position - ordered_keys[-1][0] <= max(alias_length, 12):
                continue
            ordered_keys.append((position, key))
            seen_keys.add(key)

        return [key for _, key in ordered_keys]

    def _build_result_remarks(self, row: ParsedResultRow, qualifier_label: str, disciplines: list[str]) -> str:
        parts: list[str] = []
        if qualifier_label and self._is_valid_qualifier(row.qualifier):
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
        for line in reversed([self._normalize_layout_line(item) for item in value.splitlines() if item.strip()]):
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

    def _extract_result_header_block(self, page_text: str) -> str:
        lines = [self._normalize_layout_line(line) for line in page_text.splitlines() if line.strip()]
        first_row_index: int | None = None
        for index, line in enumerate(lines):
            if re.match(r"^(?:\d+|-)\s+", line):
                first_row_index = index
                break

        if first_row_index is None:
            return ""

        start = max(0, first_row_index - 8)
        header_lines = [
            line
            for line in lines[start:first_row_index]
            if not line.lower().startswith("checksum")
            and "stand:" not in line.lower()
            and "jauswertung" not in line.lower()
            and not re.match(r"^seite\s+\d+\s*$", line, flags=re.IGNORECASE)
        ]

        if header_lines:
            return " ".join(header_lines)
        return ""

    def _summary_discipline_key(self, discipline_name: str) -> str | None:
        canonical = self._canonical(discipline_name)
        canonical = canonical.replace("obsatcle", "obstacle")
        canonical = canonical.replace("manakin", "manikin")
        canonical = canonical.replace("fl.", "fl")

        for key, aliases in self._SUMMARY_DISCIPLINE_ALIASES.items():
            if any(self._canonical(alias) in canonical for alias in aliases):
                return key
        return None

    @staticmethod
    def _discipline_signature(value: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", LifesavingProtocolParser._canonical(value))

    def _result_page_has_qualifier_column(self, page_text: str) -> bool:
        header_block = self._extract_result_header_block(page_text)
        if not header_block:
            return False
        canonical = self._canonical(header_block)
        return "q-gld" in canonical or re.search(r"\blv\b", canonical) is not None

    @staticmethod
    def _is_valid_qualifier(value: str) -> bool:
        candidate = value.strip()
        if not candidate:
            return False
        if len(candidate) > 40:
            return False
        if re.search(r"\d{1,2}:\d{2}", candidate):
            return False
        if re.search(r"\d{3,},\d{2}", candidate):
            return False
        if "..." in candidate:
            return False
        return True

    @staticmethod
    def _is_numeric_value(value: str) -> bool:
        return bool(re.fullmatch(r"[\d.,]+", value.strip()))

    def _normalize_page_text(self, value: str) -> str:
        return "\n".join(self._normalize_layout_line(line) for line in value.splitlines())

    def _normalize_layout_line(self, value: str) -> str:
        repaired = self._repair_mojibake(value)
        repaired = repaired.replace("\u00a0", " ").replace("\t", " ").replace("\ufeff", " ")
        repaired = repaired.replace("\u00c2", " ")
        repaired = re.sub(r"\s*\.\.\.\s*", " ... ", repaired)
        repaired = re.sub(r"(?<=[A-Z])(\d+):", r"\1", repaired, flags=re.IGNORECASE)
        repaired = re.sub(r"[ ]{3,}", "  ", repaired)
        return repaired.strip()

    @staticmethod
    def _repair_mojibake(value: str) -> str:
        if not value or ("\u00c3" not in value and "\u00c2" not in value):
            return value
        try:
            repaired = value.encode("latin-1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            return value
        return repaired if repaired else value

    def _parse_category_from_line(self, line: str) -> tuple[str, str]:
        cleaned = re.sub(r"\s*\([^)]*\)\s*$", "", self._normalize_layout_line(line))
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
