"""Pure extraction proposal, image preparation and link rewriting before any database write."""

import hashlib
from io import BytesIO
from urllib.parse import urlsplit

from bs4 import BeautifulSoup
from PIL import Image, UnidentifiedImageError

from . import EpubImportError
from .archive import read_package, resolve_path
from .conversion import html_to_markdown
from .inspection import documents


def raster_image(resource):
    try:
        with Image.open(BytesIO(resource.content)) as image:
            image.load()
            if image.format in ("JPEG", "PNG", "WEBP"):
                mime_type = Image.MIME[image.format]
                return resource.content, mime_type
            if image.format == "GIF":
                output = BytesIO()
                image.convert("RGBA").save(output, format="PNG")
                return output.getvalue(), "image/png"
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise EpubImportError(
            "Uma imagem do EPUB é inválida ou não suportada para os textos."
        ) from error
    raise EpubImportError("Uma imagem do EPUB não é suportada para extração de textos.")


def anchor(path, identifier, namespace):
    return "epub-" + hashlib.sha256(f"{namespace}:{path}#{identifier}".encode()).hexdigest()[:24]


def proposal(content):
    namespace = hashlib.sha256(content).hexdigest()
    package = read_package(content)
    docs = [d for d in documents(package) if d.selected]
    if not docs:
        raise EpubImportError("Não há conteúdo editável no EPUB selecionado.")
    sections, images, warnings = [], {}, []
    for doc in docs:
        soup = BeautifulSoup(doc.html, "html.parser")
        for tag in soup.find_all(id=True):
            tag["id"] = anchor(doc.href, tag["id"], namespace)
        for tag in soup.find_all("a", href=True):
            reference = urlsplit(tag["href"])
            path = resolve_path(doc.href, tag["href"])
            if path and reference.fragment:
                tag["href"] = "#" + anchor(path, reference.fragment, namespace)
            elif path:
                target = next((d for d in docs if d.href == path), None)
                if target:
                    tag["href"] = "#" + anchor(path, "__document__", namespace)
                else:
                    warnings.append({"code": "unresolved_document_link", "href": tag["href"]})
        for tag in soup.find_all("img", src=True):
            path = resolve_path(doc.href, tag["src"])
            if path is None:
                warnings.append({"code": "remote_image", "href": tag["src"]})
                continue
            resource = package.resources.get(path)
            if not resource:
                raise EpubImportError("Uma imagem referenciada pelo texto não está no EPUB.")
            if path not in images:
                images[path] = raster_image(resource)
            # A structured DOM reference is replaced by the persistence layer later.
            tag["src"] = "epub-resource:" + path
        if soup.find("svg"):
            raise EpubImportError(
                "Há conteúdo SVG inline. Revise esta seção antes de extrair textos."
            )
        if soup.find(attrs={"colspan": True}) or soup.find(attrs={"rowspan": True}):
            warnings.append({"code": "table_spans_flattened", "href": doc.href})
        sections.append(
            {
                "href": doc.href,
                "title": doc.title,
                "html": f'<a id="{anchor(doc.href, "__document__", namespace)}"></a>' + str(soup),
            }
        )
    cover = None
    if package.cover_path and package.cover_path in package.resources:
        try:
            resource = package.resources[package.cover_path]
            cover = (package.cover_path, *raster_image(resource))
        except EpubImportError:
            warnings.append({"code": "unsupported_cover", "href": package.cover_path})
    return {"sections": sections, "images": images, "cover": cover, "warnings": warnings}


def section_markdown(section, image_urls=None):
    soup = BeautifulSoup(section["html"], "html.parser")
    for tag in soup.find_all("img", src=True):
        prefix = "epub-resource:"
        if tag["src"].startswith(prefix):
            path = tag["src"][len(prefix) :]
            if image_urls is not None:
                tag["src"] = image_urls[path]
            else:
                # The preview caller supplies authenticated resource URLs.
                tag["src"] = path
    return html_to_markdown(str(soup))
