"""Refresh share previews, canonical URLs and the public sitemap."""

import re
from html import escape
from html.parser import HTMLParser
from urllib.parse import quote


SITE = "https://iianding.github.io"
START = "  <!-- Generated site metadata -->"
END = "  <!-- End generated site metadata -->"


class PageHead(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.description = ""
        self.in_title = False

    def handle_starttag(self, tag, attributes):
        if tag == "title":
            self.in_title = True
        if tag == "meta":
            attributes = dict(attributes)
            if attributes.get("name") == "description":
                self.description = attributes.get("content", "")

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def canonical(path):
    return SITE + "/" + quote(path.as_posix()[:-len("index.html")])


def update_page_metadata(root, page, cover=None):
    path = page.relative_to(root)
    source = page.read_text()
    source = re.sub(r"\n" + re.escape(START) + r".*?" + re.escape(END), "", source, count=1, flags=re.S)
    icon = "/image/site-icon.svg" if path.name == "404.html" else "../" * (len(path.parts) - 1) + "image/site-icon.svg"
    lines = [START, f'  <link rel="icon" type="image/svg+xml" href="{icon}">']
    url = None
    if "_templates" in path.parts or path.name == "404.html":
        lines.append('  <meta name="robots" content="noindex">')
    else:
        assert path.name == "index.html", path
        head = PageHead()
        head.feed(source.split("</head>", 1)[0])
        url = canonical(path)
        image, alt = cover or ("image/GEM01.jpg", "Ian Ding")
        image_url = SITE + "/" + quote(image)
        lines.append(f'  <link rel="canonical" href="{url}">')
        is_article = (cover is not None and len(path.parts) > 2 and path.parts[:2] != ("moments", "archive")) or path.as_posix() == "notes/sorting/index.html"
        properties = {
            "og:type": "article" if is_article else "website",
            "og:site_name": "Ian Ding",
            "og:title": head.title.strip(),
            "og:description": head.description,
            "og:url": url,
            "og:image": image_url,
            "og:image:alt": alt,
        }
        for key, value in properties.items():
            lines.append(f'  <meta property="{key}" content="{escape(value, quote=True)}">')
        lines.append('  <meta name="twitter:card" content="summary_large_image">')
    lines.append(END)
    page.write_text(source.replace("</head>", "\n".join(lines) + "\n</head>", 1))
    return url


def update_sitemap(root, urls):
    entries = "\n".join(f"  <url><loc>{escape(url)}</loc></url>" for url in sorted(urls))
    (root / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + entries + "\n</urlset>\n"
    )
