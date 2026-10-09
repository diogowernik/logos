"""Rebuild the legacy clean EPUB with spine order and DOM-based resource links."""

import hashlib
import posixpath
from io import BytesIO
from urllib.parse import urlsplit
from xml.etree import ElementTree as XML

from bs4 import BeautifulSoup
from ebooklib import epub

from ..epub.engine import STYLE
from ..epub.validation import validate_archive
from . import EpubImportError
from .archive import parse_xml, read_package, resolve_path
from .inspection import documents, report
from .navigation import rebuild_toc

CLEANER_VERSION = "logos-clean-3"


def clean_package(content, selected=None):
    package = read_package(content)
    docs = documents(package)
    selection = {d.href for d in docs if d.selected} if selected is None else set(selected)
    if selected is not None and (
        len(selected) != len(selection) or not selection <= {d.href for d in docs}
    ):
        raise EpubImportError("Selecione somente documentos presentes na inspeção, sem repetir.")
    kept = [doc for doc in docs if doc.href in selection]
    if not kept:
        raise EpubImportError("Selecione pelo menos uma seção de conteúdo.")
    book = epub.EpubBook()
    book.set_identifier(hashlib.sha256(content).hexdigest())
    book.set_title(package.title)
    book.set_language(package.language)
    style = epub.EpubItem(
        uid="style", file_name="Styles/clean.css", media_type="text/css",
        content=(STYLE + "\nnav ol { list-style: none; }\n").encode()
    )
    book.add_item(style)
    paths = {d.href: f"Text/section_{i:04d}.xhtml" for i, d in enumerate(kept, 1)}
    warnings = list(package.warnings)
    embedded, chapters = set(), []
    preserved_navigation = None
    anchors = {d.href: {tag["id"] for tag in BeautifulSoup(d.html, "html.parser").find_all(id=True)} for d in kept}

    def image(path):
        resource = package.resources.get(path)
        if not resource or not resource.mime_type.startswith("image/"):
            raise EpubImportError("Uma imagem usada pelo conteúdo não foi encontrada no manifesto.")
        if path not in embedded:
            content = resource.content
            if resource.mime_type == "image/svg+xml":
                svg = parse_xml(content)
                for parent in svg.iter():
                    for child in list(parent):
                        if child.tag.rsplit("}", 1)[-1].lower() in ("script", "foreignobject"):
                            parent.remove(child)
                    for name in list(parent.attrib):
                        local_name = name.rsplit("}", 1)[-1].lower()
                        if (
                            local_name.startswith("on")
                            or local_name == "style"
                            or (local_name == "href" and not parent.attrib[name].startswith("#"))
                        ):
                            del parent.attrib[name]
                content = XML.tostring(svg, encoding="utf-8")
                warnings.append({"code": "svg_sanitized", "href": path})
            book.add_item(
                epub.EpubItem(
                    uid=f"resource-{len(embedded)}",
                    file_name=path,
                    media_type=resource.mime_type,
                    content=content,
                )
            )
            embedded.add(path)
        return path

    if package.cover_path:
        resource = package.resources.get(package.cover_path)
        if resource and resource.mime_type.startswith("image/"):
            # Keep the image's original package path; metadata identifies it as the cover.
            image(package.cover_path)
            item = book.get_item_with_href(package.cover_path)
            item.properties = ["cover-image"]
            book.add_metadata(None, "meta", "", {"name": "cover", "content": item.id})
    for i, doc in enumerate(kept, 1):
        soup = BeautifulSoup(doc.html, "html.parser")
        for tag in soup.find_all(["img", "image"]):
            attr = (
                "src"
                if tag.name == "img"
                else ("xlink:href" if tag.has_attr("xlink:href") else "href")
            )
            reference = tag.get(attr)
            if not reference:
                continue
            path = resolve_path(doc.href, reference)
            if path is None:
                warnings.append({"code": "remote_image", "href": reference, "section": doc.href})
                continue
            tag[attr] = posixpath.relpath(image(path), "Text")
        for tag in soup.find_all("a", href=True):
            if tag.parent is None:
                continue
            parsed = urlsplit(tag["href"])
            path = doc.href if not parsed.path and not parsed.scheme and not parsed.netloc else resolve_path(doc.href, tag["href"])
            if path is None:
                continue
            if doc.kind == "navigation" and (path not in paths or (parsed.fragment and parsed.fragment not in anchors.get(path, set()))):
                item = tag.find_parent("li")
                if item is not None and item.find("ol") is None:
                    item.decompose()
                else:
                    tag.unwrap()
                continue
            if path in paths:
                tag["href"] = posixpath.relpath(paths[path], "Text") + (
                    f"#{parsed.fragment}" if parsed.fragment else ""
                )
            elif path in package.resources:
                warnings.append(
                    {"code": "link_target_not_in_clean", "href": tag["href"], "section": doc.href}
                )
        chapter = epub.EpubHtml(
            uid=f"section-{i}", title=doc.title, file_name=paths[doc.href], lang=package.language
        )
        chapter.content = str(soup).encode()
        if doc.kind == "navigation" and preserved_navigation is None:
            chapter.properties = ["nav"]
            preserved_navigation = chapter
        chapter.add_item(style)
        book.add_item(chapter)
        chapters.append(chapter)
    book.toc = rebuild_toc(package, kept, paths)
    book.add_item(epub.EpubNcx())
    if preserved_navigation is None:
        book.add_item(epub.EpubNav())
        book.spine = ["nav", *chapters]
    else:
        book.spine = chapters
    output = BytesIO()
    epub.write_epub(output, book)
    result = output.getvalue()
    try:
        validate_archive(result)
    except (ValueError, XML.ParseError, KeyError) as error:
        raise EpubImportError("Não foi possível reconstruir um pacote EPUB válido.") from error
    read_package(result)  # The clean output must also fit the importer limits.
    diagnostic = report(package)
    diagnostic["warnings"] = diagnostic["warnings"] + [
        warning for warning in warnings if warning not in diagnostic["warnings"]
    ]
    diagnostic["kept"] = [d.href for d in kept]
    diagnostic["removed"] = [d.href for d in docs if d.href not in selection]
    diagnostic["cleaner_version"] = CLEANER_VERSION
    return result, diagnostic
