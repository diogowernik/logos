"""Keep reference definitions local to saved Texts when assembling Markdown.

Python-Markdown determines which definitions and reference forms are valid.
Only colliding labels are renamed; saved content and visible link text stay intact.
"""

import re
from collections import Counter

import markdown
from markdown.extensions.footnotes import FootnoteExtension

EXTENSIONS = ["extra", "sane_lists", "attr_list", "footnotes"]
DEFINITION = re.compile(r"(?m)^[ \t]*(?:>[ \t]*)*\[([^\[\]]+)\]:")
FOOTNOTE = re.compile(r"\[\^([^\]]+)\]")
FENCE = re.compile(r"^[ ]{0,3}(`{3,}|~{3,})(.*)$")
INLINE_CODE = re.compile(r"(?<!`)(`+)(?!`)(.*?)\1(?!`)", re.DOTALL)
RAW_HTML = re.compile(
    r"<!--.*?-->|<(pre|script|style|textarea)\b[^>]*>.*?</\1\s*>|</?[A-Za-z][^>]*>",
    re.DOTALL | re.IGNORECASE,
)
ESCAPE = re.compile(r"\\[\\`*{}\[\]()#+\-.!_>~]")


def _prose_mask(content):
    """Protect literal code, HTML markup and escapes without changing offsets."""
    chars = list(content)

    def hide(start, end):
        chars[start:end] = ["\n" if char == "\n" else " " for char in content[start:end]]

    fence = None
    offset = 0
    in_footnote = False
    for line in content.splitlines(keepends=True):
        marker = FENCE.match(line.rstrip("\n"))
        if fence:
            hide(offset, offset + len(line))
            if marker and marker[1][0] == fence[0] and len(marker[1]) >= len(fence):
                if not marker[2].strip():
                    fence = None
        elif marker:
            fence = marker[1]
            hide(offset, offset + len(line))
        elif re.match(r"^[ ]{0,3}\[\^[^\]]+\]:", line):
            in_footnote = True
        elif line.startswith(("    ", "\t")):
            if not in_footnote:
                hide(offset, offset + len(line))
        elif line.strip():
            in_footnote = False
        offset += len(line)
    for pattern in (INLINE_CODE, RAW_HTML, ESCAPE):
        for match in pattern.finditer("".join(chars)):
            hide(match.start(), match.end())
    return "".join(chars)


def scope_references(sections):
    """Return ordered Markdown bodies with independent reference-label scopes."""
    bodies = [(section.id, section.content()) for section in sections if section.content()]
    if not any("[" in body for _, body in bodies) or len(bodies) < 2:
        return [body for _, body in bodies]
    parsed = []
    for section_id, body in bodies:
        renderer = markdown.Markdown(extensions=EXTENSIONS)
        renderer.convert(body)
        footnotes = {
            label
            for extension in renderer.registeredExtensions
            if isinstance(extension, FootnoteExtension)
            for label in extension.footnotes
        }
        parsed.append((section_id, body, renderer, footnotes))
    counts = Counter(key for _, _, renderer, _ in parsed for key in renderer.references)
    note_counts = Counter(key for _, _, _, notes in parsed for key in notes)
    used = {key for _, _, renderer, notes in parsed for key in (*renderer.references, *notes)}
    output = []
    for section_id, body, renderer, notes in parsed:
        aliases = {}
        for kind, labels, totals in (
            ("link", renderer.references, counts),
            ("note", notes, note_counts),
        ):
            for index, label in enumerate(sorted(labels), 1):
                if totals[label] < 2:
                    continue
                alias = f"logos-text-{section_id}-{kind}-{index}"
                while alias in used:
                    alias += "-local"
                used.add(alias)
                aliases[kind, label] = alias
        if not aliases:
            output.append(body)
            continue
        prose = _prose_mask(body)
        edits = []
        occupied = []
        # URL data and link titles remain literal, even when they contain brackets.
        for name in ("image_link", "link"):
            pattern = renderer.inlinePatterns[name]
            for match in pattern.getCompiledRegExp().finditer(prose):
                _, index, handled = pattern.getText(prose, match.end())
                if handled:
                    _, _, end, handled = pattern.getLink(prose, index)
                    if handled:
                        occupied.append((index, end))
        for match in renderer.parser.blockprocessors["reference"].RE.finditer(prose):
            if match[1].strip().lower() in renderer.references:
                occupied.append((match.start(), match.end()))
        for match in DEFINITION.finditer(prose):
            raw = match[1]
            key = ("note", raw[1:]) if raw.startswith("^") else ("link", raw.strip().lower())
            alias = aliases.get(key)
            if alias:
                replacement = ("^" if key[0] == "note" else "") + alias
                edits.append((match.start(1), match.end(1), replacement))
            occupied.append((match.start(), match.end()))
        for match in FOOTNOTE.finditer(prose):
            if any(start <= match.start() < end for start, end in occupied):
                continue
            alias = aliases.get(("note", match[1]))
            if alias:
                edits.append((match.start(1), match.end(1), alias))
                occupied.append((match.start(), match.end()))
        for name in ("image_reference", "reference", "short_image_ref", "short_reference"):
            pattern = renderer.inlinePatterns[name]
            for match in pattern.getCompiledRegExp().finditer(prose):
                if any(start <= match.start() < end for start, end in occupied):
                    continue
                text, index, handled = pattern.getText(prose, match.end())
                if not handled or prose[index : index + 1] == "(":
                    continue
                label, end, handled = pattern.evalId(prose, index, text)
                if not handled or label is None:
                    continue
                label = pattern.NEWLINE_CLEANUP_RE.sub(" ", label)
                if label not in renderer.references:
                    if name in ("image_reference", "reference"):
                        occupied.append((match.start(), end))
                    continue
                occupied.append((match.start(), end))
                alias = aliases.get(("link", label))
                if alias:
                    # Expand shortcuts/collapsed refs, keeping visible text/alt exactly as saved.
                    edits.append((index, end, f"[{alias}]"))
        for start, end, replacement in sorted(edits, reverse=True):
            body = body[:start] + replacement + body[end:]
        output.append(body)
    return output
