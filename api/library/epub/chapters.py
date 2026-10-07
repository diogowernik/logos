"""Preserve rendered content; derive chapter boundaries and TOC from headings."""

from dataclasses import dataclass

from bs4 import BeautifulSoup, Tag


@dataclass(frozen=True)
class Chapter:
    filename: str
    title: str
    html: BeautifulSoup
    subentries: tuple[tuple[str, str], ...]


def prepare_chapters(html: str) -> list[Chapter]:
    source = BeautifulSoup(html, "html.parser")
    groups = []
    current = []
    for node in list(source.contents):
        if isinstance(node, Tag) and node.name == "h1" and current:
            groups.append(current)
            current = []
        if isinstance(node, Tag) or str(node).strip():
            current.append(node)
    if current:
        groups.append(current)

    chapters = []
    for index, nodes in enumerate(groups, 1):
        soup = BeautifulSoup("", "html.parser")
        for node in nodes:
            soup.append(node)
        heading = soup.find("h1")
        title = heading.get_text(" ", strip=True) if heading else f"Texto {index}"
        subentries = []
        for number, heading in enumerate(soup.find_all("h2"), 1):
            heading["id"] = heading.get("id") or f"chapter-{index}-section-{number}"
            subentries.append((heading["id"], heading.get_text(" ", strip=True)))
        chapters.append(Chapter(f"chapter_{index:03}.xhtml", title, soup, tuple(subentries)))

    # Footnotes may be rendered at the end of the manuscript, in another chapter.
    locations = {
        node["id"]: chapter.filename
        for chapter in chapters
        for node in chapter.html.find_all(attrs={"id": True})
    }
    for chapter in chapters:
        for link in chapter.html.find_all("a", href=True):
            href = link["href"]
            if href.startswith("#") and href[1:] in locations:
                link["href"] = f"{locations[href[1:]]}{href}"
    return chapters
