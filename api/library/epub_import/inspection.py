"""Spine-ordered documents and conservative legacy classifications for human review."""

import re
from dataclasses import dataclass
from urllib.parse import urlsplit

from bs4 import BeautifulSoup

from . import EpubImportError
from .archive import Package, reject_xml_entities, resolve_path


@dataclass
class Document:
    href: str
    title: str
    kind: str
    selected: bool
    html: str
    text: str


def safe_body(raw):
    reject_xml_entities(raw)
    soup = BeautifulSoup(raw, "html.parser")
    body = soup.find("body")
    if body is None:
        raise EpubImportError("Um documento do EPUB não possui corpo HTML.")
    for tag in list(body.find_all(["script", "style", "iframe", "object", "embed", "form"])):
        tag.decompose()
    for tag in body.find_all(True):
        classes = tag.get("class", [])
        for name in list(tag.attrs):
            if name.lower().startswith("on") or name in ("style", "class"):
                del tag[name]
        if "page-break" in classes:
            tag["class"] = ["page-break"]
        for name in ("href", "src", "xlink:href"):
            if name not in tag.attrs:
                continue
            try:
                scheme = urlsplit(tag[name]).scheme.lower()
            except ValueError as error:
                raise EpubImportError("Um documento contém um endereço inválido.") from error
            if scheme not in (
                "",
                "http",
                "https",
                "mailto",
            ):
                del tag[name]
    for span in list(body.find_all("span")):
        if not span.attrs:
            span.unwrap()
    return soup, body


def documents(package: Package):
    result = []
    # EPUB navigation is often outside the reading spine, but can still be kept.
    navigation = [path for path, resource in package.resources.items()
                  if "nav" in resource.properties and path not in package.spine]
    for path in [*navigation, *package.spine]:
        resource = package.resources[path]
        if resource.mime_type not in ("application/xhtml+xml", "text/html"):
            raise EpubImportError("O spine contém um formato de texto não suportado.")
        soup, body = safe_body(resource.content)
        text = body.get_text(" ", strip=True)
        heading = body.find(re.compile(r"^h[1-6]$"))
        title = heading or soup.find("title")
        title = title.get_text(" ", strip=True) if title else ""
        title = title or f"Seção {len(result) + 1}"
        kind = "content"
        image_paths = {resolve_path(path, img.get("src", "")) for img in body.find_all("img")}
        if "nav" in resource.properties or body.find("nav", attrs={"epub:type": "toc"}):
            kind = "navigation"
            title = "Sumário do leitor" if path not in package.spine else "Sumário original"
        elif (
            path in package.cover_documents
            or (not text and package.cover_path and image_paths == {package.cover_path})
            or ("cover" in resource.properties)
        ):
            kind = "cover"
        elif not text and not body.find(["img", "svg"]):
            kind = "empty"
        elif re.search(r"copyright|cr[eé]ditos|dedicat[oó]ria|ep[íi]grafe", text[:500], re.I):
            kind = "front"
        elif re.search(r"agradecimentos|sobre o autor|posf[aá]cio|ap[eê]ndice", title, re.I):
            kind = "back"
        # Legacy link-density guesses remain suggestions, never automatic text deletion.
        elif len(body.find_all("a")) >= 8 and len(text) < 1500:
            kind = "possible_navigation"
        result.append(
            Document(
                path,
                title,
                kind,
                kind not in ("navigation", "cover", "empty"),
                body.decode_contents(),
                text,
            )
        )
    return result


def report(package):
    docs = documents(package)
    warnings = list(package.warnings)
    for doc in docs:
        raw = BeautifulSoup(package.resources[doc.href].content, "html.parser")
        if raw.find(["script", "iframe", "object", "embed", "form"]) or any(
            name.lower().startswith("on") for tag in raw.find_all(True) for name in tag.attrs
        ):
            warnings.append({"code": "active_content_removed", "href": doc.href})
    return {
        "title": package.title,
        "language": package.language,
        "cover": package.cover_path,
        "warnings": warnings,
        "sections": [
            {
                "href": d.href,
                "title": d.title,
                "kind": d.kind,
                "selected": d.selected,
                "characters": len(d.text),
                "preview": d.text[:200],
            }
            for d in docs
        ],
    }
