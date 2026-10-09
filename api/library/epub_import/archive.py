"""Bounded package reading; tolerate only missing presentation fonts, as in legacy."""

import posixpath
from dataclasses import dataclass
from io import BytesIO
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree as XML
from zipfile import BadZipFile, ZipFile

from . import EpubImportError

MAX_UPLOAD = 50 * 1024 * 1024
MAX_EXPANDED = 256 * 1024 * 1024
MAX_ENTRY = 32 * 1024 * 1024
MAX_ITEMS = 5000


def resolve_path(base, reference):
    try:
        parsed = urlsplit(reference)
    except ValueError as error:
        raise EpubImportError("O EPUB contém um endereço de recurso inválido.") from error
    if parsed.scheme or parsed.netloc:
        return None
    path = posixpath.normpath(posixpath.join(posixpath.dirname(base), unquote(parsed.path)))
    if path.startswith(("/", "../")) or path == ".." or "\\" in path:
        raise EpubImportError("O EPUB contém um caminho de recurso inválido.")
    return path


def reject_xml_entities(content):
    # XML may be UTF-16/32; null bytes must not bypass the entity declaration check.
    if b"<!ENTITY" in content.replace(b"\x00", b"").upper():
        raise EpubImportError("O EPUB contém entidades XML não suportadas.")


def parse_xml(content):
    reject_xml_entities(content)
    try:
        return XML.fromstring(content)
    except XML.ParseError as error:
        raise EpubImportError("O EPUB contém um documento XML inválido.") from error


@dataclass(frozen=True)
class Resource:
    identifier: str
    path: str
    mime_type: str
    properties: tuple[str, ...]
    content: bytes


@dataclass
class Package:
    title: str
    language: str
    resources: dict[str, Resource]
    spine: list[str]
    cover_path: str | None
    cover_documents: set[str]
    warnings: list[dict]


def read_package(content):
    if len(content) > MAX_UPLOAD:
        raise EpubImportError("O EPUB deve ter até 50 MB.")
    try:
        return _read(content)
    except EpubImportError:
        raise
    except (BadZipFile, KeyError, ValueError, RuntimeError, NotImplementedError) as error:
        raise EpubImportError("EPUB inválido ou incompleto. Confira o arquivo original.") from error


def _read(content):
    with ZipFile(BytesIO(content)) as archive:
        entries = archive.infolist()
        if len(entries) > MAX_ITEMS or sum(i.file_size for i in entries) > MAX_EXPANDED:
            raise EpubImportError("O EPUB excede os limites de recursos descomprimidos.")
        names = {i.filename for i in entries}
        if len(names) != len(entries):
            raise EpubImportError("O EPUB contém caminhos duplicados.")
        for entry in entries:
            if entry.file_size > MAX_ENTRY or entry.flag_bits & 1:
                raise EpubImportError("O EPUB contém um recurso muito grande ou criptografado.")
            if resolve_path("", entry.filename.rstrip("/")) != entry.filename.rstrip("/"):
                raise EpubImportError("O EPUB contém um caminho de arquivo inválido.")
        if archive.read("mimetype").strip() != b"application/epub+zip":
            raise EpubImportError("Escolha um arquivo EPUB válido.")
        container = parse_xml(archive.read("META-INF/container.xml"))
        rootfile = container.find(".//{*}rootfile")
        if rootfile is None:
            raise EpubImportError("O EPUB não informa seu pacote de conteúdo.")
        opf_path = resolve_path("", rootfile.attrib["full-path"])
        if opf_path is None:
            raise EpubImportError("O EPUB aponta para um pacote externo não suportado.")
        package = parse_xml(archive.read(opf_path))
        resources, ids, warnings = {}, {}, []
        for item in package.findall("./{*}manifest/{*}item"):
            identifier, href = item.attrib["id"], item.attrib["href"]
            path = resolve_path(opf_path, href)
            mime_type = item.attrib.get("media-type", "")
            if path is None:
                raise EpubImportError("O manifesto contém um recurso externo não suportado.")
            if identifier in ids or path in resources:
                raise EpubImportError("O manifesto contém recursos duplicados.")
            if path not in names:
                if "font" in mime_type or path.lower().endswith(
                    (".otf", ".ttf", ".woff", ".woff2")
                ):
                    warnings.append({"code": "missing_font", "href": path})
                    continue
                raise EpubImportError(f"Recurso obrigatório ausente no EPUB: {href}")
            resource = Resource(
                identifier,
                path,
                mime_type,
                tuple(item.attrib.get("properties", "").split()),
                archive.read(path),
            )
            resources[path], ids[identifier] = resource, path
        spine = []
        for item in package.findall("./{*}spine/{*}itemref"):
            path = ids.get(item.attrib.get("idref"))
            if not path:
                raise EpubImportError("O spine aponta para conteúdo ausente.")
            if path in spine:
                raise EpubImportError("O spine contém documentos repetidos.")
            spine.append(path)
        if not spine:
            raise EpubImportError("O EPUB não possui uma sequência de leitura.")
        cover = next((r.path for r in resources.values() if "cover-image" in r.properties), None)
        for meta in package.findall("./{*}metadata/{*}meta"):
            if meta.get("name") == "cover" and not cover:
                cover = ids.get(meta.get("content"))
        cover_docs = {
            resolve_path(opf_path, item.get("href", ""))
            for item in package.findall("./{*}guide/{*}reference")
            if item.get("type") == "cover"
        }
        if not cover:
            cover = next(
                (
                    r.path
                    for r in resources.values()
                    if r.mime_type.startswith("image/")
                    and any(word in r.path.lower() for word in ("cover", "capa"))
                ),
                None,
            )
        if "META-INF/encryption.xml" in names:
            encryption = parse_xml(archive.read("META-INF/encryption.xml"))
            for cipher in encryption.findall(".//{*}CipherReference"):
                path = resolve_path("", cipher.get("URI", ""))
                resource = resources.get(path)
                if resource and not (
                    "font" in resource.mime_type or path.endswith((".ttf", ".otf"))
                ):
                    raise EpubImportError("EPUB com conteúdo protegido não é suportado.")
            warnings.append({"code": "font_obfuscation_removed"})

        def metadata(name, fallback):
            item = package.find(f"./{{*}}metadata/{{*}}{name}")
            return "".join(item.itertext()).strip() if item is not None else fallback

        return Package(
            metadata("title", "Livro"),
            metadata("language", "pt-BR"),
            resources,
            spine,
            cover,
            cover_docs,
            warnings,
        )
