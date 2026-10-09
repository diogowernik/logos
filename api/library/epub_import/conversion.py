"""Legacy HTML-to-Markdown conversion, separated and extended for tables and nested blocks."""

import re

from bs4 import BeautifulSoup, Comment, NavigableString, Tag


def html_to_markdown(content):
    soup = BeautifulSoup(content, "html.parser")

    def inline(node):
        identifier = node.get("id") if isinstance(node, Tag) else None
        prefix = f'<a id="{identifier}"></a>' if identifier else ""
        return prefix + inline_content(node)

    def inline_content(node):
        if isinstance(node, Comment):
            return ""
        if isinstance(node, NavigableString):
            # Protect literal Markdown syntax introduced by HTML text nodes.
            return re.sub(r"([\\`*\[\]_])", r"\\\1", str(node))
        if not isinstance(node, Tag):
            return ""
        name = node.name.lower()
        children = "".join(inline(child) for child in node.children)
        if name in ("b", "strong", "i", "em", "s", "del"):
            marker = "**" if name in ("b", "strong") else "~~" if name in ("s", "del") else "*"
            return f"{marker}{children.strip()}{marker}" if children.strip() else ""
        if name == "code":
            text = node.get_text()
            marker = "`" * (max((len(v) for v in re.findall(r"`+", text)), default=0) + 1)
            return f"{marker} {text} {marker}"
        if name == "br":
            return "  \n"
        if name in ("sup", "sub"):
            return f"<{name}>{children}</{name}>"
        if name == "a":
            href = node.get("href", "")
            return f"[{children or href}](<{href}>)" if href else children
        if name == "img":
            src = node.get("src", "")
            alt = re.sub(r"([\[\]\\])", r"\\\1", node.get("alt", ""))
            return f"![{alt}](<{src}>)" if src else alt
        return children

    def block(node):
        identifier = node.get("id") if isinstance(node, Tag) else None
        if isinstance(node, Tag) and node.name in ("img", "a", "em", "strong", "code", "br"):
            identifier = None  # These elements are handled by the inline converter.
        prefix = f'\n\n<a id="{identifier}"></a>\n\n' if identifier else ""
        return prefix + block_content(node)

    def block_content(node):
        if isinstance(node, Comment):
            return ""
        if isinstance(node, NavigableString):
            return inline(node) if node.strip() else ""
        if not isinstance(node, Tag):
            return ""
        name = node.name.lower()
        text = "".join(inline(c) for c in node.children).strip()
        if name in ("script", "style", "iframe", "object", "embed"):
            return ""
        if "page-break" in node.get("class", []):
            return "\n\n[[pagebreak]]\n\n" + "".join(block(c) for c in node.children)
        if name in ("h1", "h2", "h3", "h4", "h5", "h6"):
            return f"\n\n{'#' * int(name[1])} {text}\n\n"
        if name == "p":
            return f"\n\n{text}\n\n" if text else ""
        if name == "pre":
            code = node.get_text()
            fence = "`" * max(3, max((len(v) + 1 for v in re.findall(r"`+", code)), default=3))
            return f"\n\n{fence}\n{code}\n{fence}\n\n"
        if name in ("ul", "ol"):
            lines = []
            start = int(node.get("start", 1)) if str(node.get("start", 1)).isdigit() else 1
            for i, li in enumerate(node.find_all("li", recursive=False), start):
                item = "".join(
                    block(c) if isinstance(c, Tag) and c.name in ("ul", "ol", "p") else inline(c)
                    for c in li.children
                ).strip()
                prefix = f"{i}. " if name == "ol" else "- "
                lines.append(prefix + item.replace("\n", "\n" + " " * len(prefix)))
            return "\n\n" + "\n".join(lines) + "\n\n"
        if name == "blockquote":
            quote = "".join(block(c) for c in node.children).strip()
            return "\n\n" + "\n".join("> " + line for line in quote.splitlines()) + "\n\n"
        if name == "table":
            rows = [
                [
                    inline(cell).strip().replace("|", r"\|").replace("\n", " ")
                    for cell in row.find_all(["td", "th"], recursive=False)
                ]
                for row in node.find_all("tr")
            ]
            rows = [row for row in rows if row]
            if not rows:
                return ""
            width = max(map(len, rows))
            rows = [row + [""] * (width - len(row)) for row in rows]
            table = ["| " + " | ".join(row) + " |" for row in rows]
            table.insert(1, "| " + " | ".join(["---"] * width) + " |")
            return "\n\n" + "\n".join(table) + "\n\n"
        if name == "hr":
            return "\n\n---\n\n"
        if name in ("img", "a", "em", "strong", "code", "br"):
            return inline(node)
        return "".join(block(c) for c in node.children)

    markdown = "".join(block(node) for node in soup.contents)
    return re.sub(r"\n{3,}", "\n\n", markdown.replace("\r\n", "\n")).strip() + "\n"
