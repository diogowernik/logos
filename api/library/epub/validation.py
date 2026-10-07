"""Basic package integrity check, not a substitute for EPUBCheck."""

import posixpath
from io import BytesIO
from xml.etree import ElementTree
from zipfile import ZIP_STORED, ZipFile


def validate_archive(content: bytes) -> None:
    with ZipFile(BytesIO(content)) as archive:
        first = archive.infolist()[0]
        if first.filename != "mimetype" or first.compress_type != ZIP_STORED:
            raise ValueError("EPUB inválido: mimetype ausente ou comprimido.")
        if archive.read("mimetype") != b"application/epub+zip" or archive.testzip():
            raise ValueError("EPUB inválido: arquivo corrompido.")
        container = ElementTree.fromstring(archive.read("META-INF/container.xml"))
        rootfile = container.find(".//{*}rootfile").attrib["full-path"]
        package = ElementTree.fromstring(archive.read(rootfile))
        manifest = {
            item.attrib["id"]: posixpath.normpath(
                posixpath.join(posixpath.dirname(rootfile), item.attrib["href"])
            )
            for item in package.findall("./{*}manifest/{*}item")
        }
        for path in manifest.values():
            if path not in archive.namelist():
                raise ValueError("EPUB inválido: recurso ausente.")
            if path.endswith((".xhtml", ".ncx")):
                ElementTree.fromstring(archive.read(path))
        spine = package.findall("./{*}spine/{*}itemref")
        if not spine or any(item.attrib["idref"] not in manifest for item in spine):
            raise ValueError("EPUB inválido: sequência de leitura incompleta.")
