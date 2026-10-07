"""Markdown conversion adapted from the legacy publications/markdown_utils.py."""

import markdown

EXTENSIONS = ["extra", "sane_lists", "attr_list", "footnotes"]
PAGEBREAK_MARKERS = {r"\pagebreak", "---PAGEBREAK---", "[[pagebreak]]"}


def render_markdown(content: str) -> str:
    # Leave fenced code untouched, even if it contains a pagebreak marker.
    renderer = markdown.Markdown(extensions=EXTENSIONS)
    html = renderer.convert(content)
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    for paragraph in soup.find_all("p"):
        if paragraph.get_text().strip() in PAGEBREAK_MARKERS:
            replacement = soup.new_tag("div", attrs={"class": "page-break"})
            paragraph.replace_with(replacement)
    return str(soup)
