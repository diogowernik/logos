"""Shared, ORM-independent input for copy, reader and future EPUB export."""

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Section:
    id: int
    title: str
    markdown: str


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
            body = section.markdown.strip()
            first = body.splitlines()[0] if body else ""
            heading = re.sub(r"^#{1,6}\s+", "", first).strip().rstrip("#").strip()
            if section.title and not (
                first.startswith("#") and heading.casefold() == section.title.casefold()
            ):
                body = f"## {section.title}\n\n{body}".rstrip()
            parts.append(body)
        return "\n\n".join(parts).rstrip() + "\n"
