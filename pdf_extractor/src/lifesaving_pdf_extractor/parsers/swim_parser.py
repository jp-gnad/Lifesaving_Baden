from __future__ import annotations

from .lifesaving_parser import LifesavingProtocolParser


class SwimmingProtocolParser(LifesavingProtocolParser):
    """Temporary compatibility parser.

    Many lifesaving youth protocols contain discipline names like freestyle or breaststroke,
    which currently confuse the coarse classifier. Until a dedicated swimming parser exists,
    we reuse the lifesaving protocol rules here instead of falling back to placeholders.
    """

    name = "swimming"
