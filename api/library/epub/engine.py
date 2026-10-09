"""EbookLib motor adapted from legacy md_to_epub_service.py, without ORM/storage."""

from dataclasses import dataclass
from io import BytesIO
from urllib.parse import urlsplit

from ebooklib import epub
from PIL import Image

from .chapters import prepare_chapters
from .markdown import render_markdown
from .validation import validate_archive

COMPILER_VERSION = "logos-epub-2"
STYLE = """
body { line-height: 1.5; }
img { display: block; margin: 1.2em auto; max-width: 100%; height: auto; }
.image-portrait { width: 180px; }
.image-landscape { width: 300px; }
h1 { page-break-before: always; }
body > h1:first-child { page-break-before: avoid; }
h2 { margin-top: 1.5em; margin-bottom: .6em; }
.page-break { page-break-before: always; }
pre { white-space: pre-wrap; }
table { border-collapse: collapse; max-width: 100%; }
td, th { border: 1px solid #aaa; padding: .3em; }
"""


class EpubGenerationError(ValueError):
    pass


@dataclass(frozen=True)
class ImageResource:
    identifier: str
    content: bytes
    mime_type: str

    def epub_image(self) -> tuple[str, bytes, str]:
        content, mime_type = self.content, self.mime_type
        if mime_type == "image/webp":
            # WebP is not a core EPUB media type; preserve its transparency in PNG.
            with Image.open(BytesIO(content)) as image:
                output = BytesIO()
                image.save(output, format="PNG")
            content, mime_type = output.getvalue(), "image/png"
        extension = {"image/jpeg": "jpg", "image/png": "png"}[mime_type]
        return f"images/{self.identifier}.{extension}", content, mime_type

    def orientation_class(self) -> str:
        with Image.open(BytesIO(self.content)) as image:
            return "image-landscape" if image.width > image.height else "image-portrait"


def generate_epub(manuscript, *, identifier, author="", cover=None, images=()) -> bytes:
    if not manuscript.markdown().strip():
        raise EpubGenerationError("Adicione conteúdo Markdown antes de gerar o EPUB.")
    chapters = prepare_chapters(render_markdown(manuscript.markdown()))
    if not chapters:
        raise EpubGenerationError("Adicione conteúdo Markdown antes de gerar o EPUB.")
    first_heading = next(
        (chapter.html.find("h1") for chapter in chapters if chapter.html.find("h1")), None
    )
    book = epub.EpubBook()
    book.set_identifier(identifier)
    book.set_title(first_heading.get_text(" ", strip=True) if first_heading else "Livro")
    book.set_language("pt-BR")
    if author:
        book.add_author(author)
    if cover:
        name, content, _ = cover.epub_image()
        book.set_cover(f"cover.{name.rsplit('.', 1)[1]}", content)
        book.get_item_with_id("cover").title = "Capa"

    style = epub.EpubItem(
        uid="style", file_name="styles/book.css", media_type="text/css", content=STYLE.encode()
    )
    book.add_item(style)
    image_map = {f"/api/library/assets/{image.identifier}/file": image for image in images}
    embedded = set()
    for chapter in chapters:
        for tag in chapter.html.find_all("img", src=True):
            image = image_map.get(urlsplit(tag["src"]).path.rstrip("/"))
            tag["class"] = [
                *tag.get("class", []),
                image.orientation_class() if image else "image-portrait",
            ]
            if image:
                name, content, mime_type = image.epub_image()
                tag["src"] = name
                if image.identifier not in embedded:
                    book.add_item(
                        epub.EpubItem(
                            uid=f"image-{image.identifier}",
                            file_name=name,
                            media_type=mime_type,
                            content=content,
                        )
                    )
                    embedded.add(image.identifier)
    items, toc = [], []
    for chapter in chapters:
        item = epub.EpubHtml(title=chapter.title, file_name=chapter.filename, lang="pt-BR")
        item.content = str(chapter.html)
        item.add_item(style)
        book.add_item(item)
        items.append(item)
        children = tuple(
            epub.Link(f"{chapter.filename}#{anchor}", title, anchor)
            for anchor, title in chapter.subentries
        )
        toc.append((item, children) if children else item)
    book.toc = tuple(toc)
    book.add_item(epub.EpubNcx())
    navigation = epub.EpubNav(title="Sumário")
    book.add_item(navigation)
    book.spine = (["cover"] if cover else []) + [navigation] + items
    output = BytesIO()
    epub.write_epub(output, book, {"raise_exceptions": True})
    content = output.getvalue()
    validate_archive(content)
    return content
