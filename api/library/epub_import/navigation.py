"""Rebuild navigation while retaining valid destinations and nested headings."""
from urllib.parse import unquote, urlsplit
from bs4 import BeautifulSoup
from ebooklib import epub
from .archive import parse_xml, resolve_path


def rebuild_toc(package, kept, paths):
    anchors = {d.href: {t["id"] for t in BeautifulSoup(d.html, "html.parser").find_all(id=True)} for d in kept}
    counter = 0

    def entry(base, label, href, children):
        nonlocal counter
        counter += 1
        parsed = urlsplit(href or "")
        target = (base if not parsed.path and not parsed.scheme and not parsed.netloc else resolve_path(base, href)) if href else None
        fragment = unquote(parsed.fragment)
        if target in paths and (not fragment or fragment in anchors[target]):
            destination = paths[target] + (f"#{fragment}" if fragment else "")
            link = epub.Link(destination, label or "Seção", f"toc-{counter}")
            return [(link, children)] if children else [link]
        # A grouping heading may have no destination of its own.
        if children:
            return [(epub.Section(label or "Seção"), children)]
        return []

    def html_list(ol, base, depth=0):
        if ol is None or depth > 30:
            return []
        result = []
        for li in ol.findall("./{*}li"):
            heading = next((n for n in li if n.tag.rsplit("}", 1)[-1] in ("a", "span")), None)
            children = html_list(li.find("./{*}ol"), base, depth + 1)
            label = "".join(heading.itertext()).strip() if heading is not None else ""
            result.extend(entry(base, label, heading.get("href") if heading is not None else None, children))
        return result

    def ncx_list(parent, base, depth=0):
        if parent is None or depth > 30:
            return []
        result = []
        for node in parent.findall("./{*}navPoint"):
            label = node.find("./{*}navLabel/{*}text")
            content = node.find("./{*}content")
            result.extend(entry(base, "".join(label.itertext()).strip() if label is not None else "", content.get("src") if content is not None else None, ncx_list(node, base, depth + 1)))
        return result

    result = []
    for resource in package.resources.values():
        if "nav" not in resource.properties:
            continue
        root = parse_xml(resource.content)
        for nav in root.findall(".//{*}nav"):
            if "toc" in nav.get("{http://www.idpf.org/2007/ops}type", "").split() or nav.get("role") == "doc-toc":
                result = html_list(nav.find("./{*}ol"), resource.path)
                break
        if result:
            break
    if not result:
        for resource in package.resources.values():
            if resource.mime_type == "application/x-dtbncx+xml":
                result = ncx_list(parse_xml(resource.content).find("./{*}navMap"), resource.path)
                if result:
                    break
    # The source TOC intentionally omits some reading pages (e.g. illustrated
    # chapter openers). Keep those pages without inventing extra TOC entries.
    if result:
        return tuple(result)
    for doc in kept:
        if doc.kind not in ("navigation", "cover", "empty"):
            result.extend(entry(doc.href, doc.title, doc.href.rsplit("/", 1)[-1], []))
    return tuple(result)
