"""Shared, ORM-independent input for copy, reader and future EPUB export."""

from dataclasses import dataclass
from functools import cached_property

from .markdown_references import scope_references


@dataclass(frozen=True)
class Section:
    id: int
    title: str
    markdown: str

    def content(self) -> str:
        return self.markdown.strip()


@dataclass(frozen=True)
class Manuscript:
    title: str
    subtitle: str
    sections: tuple[Section, ...]

    @cached_property
    def _markdown(self) -> str:
        parts = scope_references(self.sections)
        return "\n\n".join(parts).rstrip() + "\n"

    def markdown(self) -> str:
        return self._markdown
