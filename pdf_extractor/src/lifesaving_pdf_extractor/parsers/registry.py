from __future__ import annotations

from ..models import DocumentContext, DocumentType
from .base_parser import BaseProtocolParser
from .generic_parser import GenericProtocolParser
from .lifesaving_parser import LifesavingProtocolParser
from .swim_parser import SwimmingProtocolParser


class ParserRegistry:
    """Resolve parsers by explicit name or classifier hint."""

    def __init__(self) -> None:
        self._parsers: dict[str, BaseProtocolParser] = {
            "generic": GenericProtocolParser(),
            "swimming": SwimmingProtocolParser(),
            "lifesaving": LifesavingProtocolParser(),
        }

    def resolve(self, context: DocumentContext, parser_override: str = "auto") -> BaseProtocolParser:
        if parser_override != "auto":
            if parser_override not in self._parsers:
                available = ", ".join(sorted(self._parsers))
                raise ValueError(f"Unknown parser '{parser_override}'. Available parsers: {available}")
            return self._parsers[parser_override]

        if context.document_type == DocumentType.SWIMMING:
            return self._parsers["swimming"]
        if context.document_type == DocumentType.LIFESAVING:
            return self._parsers["lifesaving"]
        return self._parsers["generic"]

    def available_parsers(self) -> tuple[str, ...]:
        return tuple(sorted(self._parsers))
