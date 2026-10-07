"""Shared, ORM-independent input for copy, reader and future EPUB export."""

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Section:
    id: int
    title: str
    markdown: str

    def content(self) -> str:
        body = self.markdown.strip()
        first = body.splitlines()[0] if body else ""
        heading = re.sub(r"^#{1,6}\s+", "", first).strip().rstrip("#").strip()
        if self.title and not (
            first.startswith("#") and heading.casefold() == self.title.casefold()
        ):
            body = f"## {self.title}\n\n{body}".rstrip()
        return body


@dataclass(frozen=True)
class Manuscript:
    title: str
    subtitle: str
    sections: tuple[Section, ...]

    def markdown(self) -> str:
        introduction = f"# {self.title}"
        if self.subtitle:
            introduction += f"\n\n{self.subtitle}"
        parts = [introduction]
        for section in self.sections:
            parts.append(section.content())
        return "\n\n".join(parts).rstrip() + "\n"
