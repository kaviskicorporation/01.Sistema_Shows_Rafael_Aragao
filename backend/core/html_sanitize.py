"""Sanitiza HTML de e-mail para exibição segura."""

from __future__ import annotations

import re
from html.parser import HTMLParser

ALLOWED_TAGS = {
    "a",
    "b",
    "blockquote",
    "br",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "i",
    "img",
    "li",
    "ol",
    "p",
    "span",
    "strong",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
}

ALLOWED_ATTRS = {
    "a": {"href", "title", "target", "rel"},
    "img": {"src", "alt", "width", "height"},
    "td": {"colspan", "rowspan"},
    "th": {"colspan", "rowspan"},
}


class _Sanitizer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag not in ALLOWED_TAGS:
            return
        allowed = ALLOWED_ATTRS.get(tag, set())
        clean = []
        for key, val in attrs:
            key = key.lower()
            if key not in allowed or val is None:
                continue
            if key in ("href", "src") and re.match(
                r"^\s*(javascript:|data:)", val, re.I
            ):
                continue
            if key == "href" and not re.match(
                r"^\s*(https?:|mailto:|/|#)", val, re.I
            ):
                continue
            clean.append(f'{key}="{_escape_attr(val)}"')
        if tag == "a":
            keys = {item.split("=", 1)[0] for item in clean}
            if "target" not in keys:
                clean.append('target="_blank"')
            if "rel" not in keys:
                clean.append('rel="noopener noreferrer"')
        self.out.append(f"<{tag}" + ((" " + " ".join(clean)) if clean else "") + ">")

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in ALLOWED_TAGS and tag not in ("br", "img"):
            self.out.append(f"</{tag}>")

    def handle_data(self, data):
        self.out.append(_escape_text(data))

    def handle_entityref(self, name):
        self.out.append(f"&{name};")

    def handle_charref(self, name):
        self.out.append(f"&#{name};")


def _escape_text(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _escape_attr(s: str) -> str:
    return _escape_text(s).replace('"', "&quot;")


def html_to_text(raw: str) -> str:
    if not raw:
        return ""
    text = re.sub(r"(?i)<br\s*/?>", "\n", raw)
    text = re.sub(r"(?i)</p>", "\n", text)
    text = re.sub(r"(?i)</div>", "\n", text)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"[ \t]+\n", "\n", re.sub(r"[ \t]{2,}", " ", text)).strip()


def wrap_html_document(fragment: str) -> str:
    body = (fragment or "").strip()
    if not body:
        return ""
    if re.search(r"(?i)<html", body):
        return body
    return (
        "<html><body style=\"font-family:Arial,Helvetica,sans-serif;"
        "font-size:15px;line-height:1.55;color:#1a1a1a\">"
        f"{body}</body></html>"
    )


def text_to_html(body_text: str) -> str:
    paragraphs = [
        _escape_text(block.strip()).replace("\n", "<br />")
        for block in (body_text or "").split("\n\n")
        if block.strip()
    ]
    if not paragraphs:
        return ""
    body = "".join(f"<p style='margin:0 0 12px'>{p}</p>" for p in paragraphs)
    return wrap_html_document(body)


def sanitize_html(raw: str) -> str:
    if not raw:
        return ""
    parser = _Sanitizer()
    try:
        parser.feed(raw)
        parser.close()
    except Exception:
        return _escape_text(re.sub(r"<[^>]+>", "", raw))
    return "".join(parser.out)


_BARE_URL = re.compile(r"(?<![=\"'(>])((?:https?://|www\.)[^\s<>\"']+)", re.I)


def _url_to_anchor(match: re.Match) -> str:
    url = match.group(1).rstrip(".,;:!?")
    href = url if re.match(r"^https?://", url, re.I) else f"https://{url}"
    return (
        f'<a href="{_escape_attr(href)}" target="_blank" '
        f'rel="noopener noreferrer">{_escape_text(url)}</a>'
    )


def prepare_faq_answer(raw: str) -> str:
    """Transforma a resposta do admin em HTML seguro com links clicáveis."""
    text = (raw or "").strip()
    if not text:
        return ""

    def linkify_plain(chunk: str) -> str:
        return _BARE_URL.sub(_url_to_anchor, chunk)

    if not re.search(r"<[a-z/]", text, re.I):
        escaped = _escape_text(text)
        return linkify_plain(escaped).replace("\n", "<br />")

    parts = re.split(r"(<[^>]+>)", text)
    rebuilt = []
    for part in parts:
        if part.startswith("<"):
            rebuilt.append(part)
        else:
            rebuilt.append(linkify_plain(part))
    return sanitize_html("".join(rebuilt))
