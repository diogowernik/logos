"""Shared, ORM-independent input for copy, reader and future EPUB export."""

from dataclasses import dataclass


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

    def markdown(self) -> str:
        parts = [section.content() for section in self.sections if section.content()]
        return "\n\n".join(parts).rstrip() + "\n"
