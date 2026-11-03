"""Render static album pages and the newest-first Moments list.

Run with Python 3 after editing moments/albums.json. No build dependency is
needed on the website host; the generated HTML works when opened from disk.
"""

import json
import os
import re
from datetime import date
from hashlib import sha256
from html import escape
from pathlib import Path
from urllib.parse import unquote, urlsplit, urlunsplit


ROOT = Path(__file__).resolve().parents[1]
COLLECTION = ROOT / "moments/index.html"


def relative(target, page):
    result = Path(os.path.relpath(target, page.parent)).as_posix()
    return result if result.startswith(".") else "./" + result


def versioned_asset(target, page):
    version = sha256(target.read_bytes()).hexdigest()[:12]
    return relative(target, page) + "?v=" + version


def rebase(fragment, source, destination):
    def replace(match):
        attribute, value = match.groups()
        url = urlsplit(value)
        if url.scheme or url.netloc or not url.path:
            return match.group()
        target = (source.parent / unquote(url.path)).resolve()
        value = urlunsplit(("", "", relative(target, destination), url.query, url.fragment))
        return f'{attribute}="{value}"'

    return re.sub(r'(href|src)="([^"]+)"', replace, fragment)


def album_path(album):
    return ROOT / "moments" / album["city"] / album["date"] / "index.html"


def asset_folder(album):
    return ROOT / "memory_image" / album["city"] / album["date"]


def identifier(album):
    return album["city"] + "-" + album["date"]


def display_date(album):
    value = date.fromisoformat(album["date"])
    return f"{value.day} {value.strftime('%B')} {value.year}"


def photo_markup(photo, album, page, first=False):
    folder = asset_folder(album)
    full = versioned_asset(folder / photo["file"], page)
    preview = versioned_asset(folder / "previews" / photo["file"], page)
    layout = photo["layout"]
    classes = "album-photo-portrait album-photo-solo" if layout == "solo" else "album-photo-" + layout
    ratio = f' style="--photo-ratio: {photo["width"]} / {photo["height"]}"' if layout in ("wide", "landscape") else ""
    loading = 'fetchpriority="high"' if first else 'loading="lazy"'
    alt = escape(photo["alt"], quote=True)
    return f'''          <a class="album-photo glass-surface {classes}" href="{full}" data-album-photo aria-label="View photograph: {alt}"{ratio}>
            <img src="{preview}" width="{photo['width']}" height="{photo['height']}" alt="{alt}" {loading} decoding="async">
          </a>'''


def pagination(albums, index, page):
    items = []
    if index > 0:
        album = albums[index - 1]
        items.append(f'''        <a class="moment-pagination-link glass-surface" href="{relative(album_path(album), page)}"><span class="moment-pagination-label">&larr; Newer album</span><span>{escape(album['title'])}</span></a>''')
    if index + 1 < len(albums):
        album = albums[index + 1]
        items.append(f'''        <a class="moment-pagination-link moment-next glass-surface" href="{relative(album_path(album), page)}"><span class="moment-pagination-label">Older album &rarr;</span><span>{escape(album['title'])}</span></a>''')
    return '      <nav class="moment-pagination" aria-label="Browse albums">\n' + "\n".join(items) + "\n      </nav>" if items else ""


def render_page(album, albums, index, header, footer):
    page = album_path(album)
    title = escape(album["title"])
    description = escape(album["description"], quote=True)
    count = len(album["photos"])
    back = relative(COLLECTION, page) + "#" + identifier(album)
    photos = [photo_markup(photo, album, page, i == 0) for i, photo in enumerate(album["photos"])]
    page_header = rebase(header, COLLECTION, page).replace('aria-current="page"', 'aria-current="location"')
    page_footer = rebase(footer, COLLECTION, page)
    remaining = "\n".join(photos[1:])
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{title} {description} {count} photographs from {display_date(album)}, by Ian Ding.">
  <meta name="theme-color" content="#ffffff">
  <title>{title} — Moments — Ian Ding</title>
  <link rel="stylesheet" href="{versioned_asset(ROOT / 'style.css', page)}">
  <link rel="stylesheet" href="{versioned_asset(ROOT / 'moments/album.css', page)}">
  <script src="{versioned_asset(ROOT / 'glass-effects.js', page)}" defer></script>
  <script src="{versioned_asset(ROOT / 'moments/album.js', page)}" defer></script>
</head>
<body class="photo-journal">
  <a class="skip" href="#main">Skip to content</a>
  <div class="wrap">
{page_header}
    <main id="main" class="subpage moment-detail-page photo-album-page">
      <a class="back-link" href="{back}">&larr; Back to Moments</a>
      <article aria-labelledby="page-title">
        <div class="moment-detail-intro album-intro">
          <p class="moment-location">{escape(album['location'])}</p>
          <h1 id="page-title">{title}</h1>
          <p class="lead">{escape(album['description'])}</p>
          <div class="moment-detail-meta"><span class="moment-kind glass-surface">Photo journal</span><time datetime="{album['date']}">{display_date(album)}</time><span>{count} photographs</span></div>
        </div>
        <div class="album-opening">
{photos[0]}
        </div>
        <section class="album-sequence" aria-labelledby="album-photos-title">
          <div class="moment-album-heading">
            <h2 id="album-photos-title">{escape(album['section_title'])}</h2>
            <p>Select a photograph to see the full frame.</p>
          </div>
          <div class="album-grid">
{remaining}
          </div>
        </section>
        <p class="album-signoff">{escape(album['signoff'])}</p>
      </article>
{pagination(albums, index, page)}
      <nav class="album-return" aria-label="Album navigation">
        <a class="button" href="{back}"><span>&larr; All moments</span></a>
        <a class="text-link" href="#page-title">Back to top &uarr;</a>
      </nav>
    </main>
{page_footer}
  </div>
  <dialog id="photo-viewer" class="photo-viewer" aria-labelledby="viewer-title">
    <div class="viewer-toolbar">
      <p id="viewer-title" class="viewer-title">{title}</p>
      <p class="viewer-count" aria-live="polite" aria-atomic="true">1 / {count}</p>
      <button type="button" class="viewer-control glass-surface" data-viewer-close aria-label="Close photograph" autofocus><span aria-hidden="true">&times;</span></button>
    </div>
    <div class="viewer-stage">
      <img id="viewer-image" alt="" hidden>
      <p class="viewer-status" role="status">Loading photograph&hellip;</p>
    </div>
    <div class="viewer-footer">
      <button type="button" class="viewer-control glass-surface" data-viewer-previous aria-label="Previous photograph"><span aria-hidden="true">&larr;</span></button>
      <p class="viewer-caption"></p>
      <button type="button" class="viewer-control glass-surface" data-viewer-next aria-label="Next photograph"><span aria-hidden="true">&rarr;</span></button>
    </div>
  </dialog>
</body>
</html>
'''


def collection_card(album, index):
    anchor = identifier(album)
    count = len(album["photos"])
    loading = 'fetchpriority="high"' if index == 0 else 'loading="lazy"'
    return f'''          <li data-date="{album['date']}">
            <a id="{anchor}" class="moment-entry moment-entry-link glass-surface" href="{relative(album_path(album), COLLECTION)}" aria-labelledby="{anchor}-title">
              <div class="moment-copy">
                <p class="moment-location">{escape(album['location'])}</p>
                <h2 id="{anchor}-title">{escape(album['title'])}</h2>
                <p class="moment-description">{escape(album['description'])}</p>
                <div class="moment-entry-footer">
                  <p class="moment-date"><time datetime="{album['date']}">{display_date(album)}</time><span>&middot; {count} photographs</span></p>
                  <span class="moment-format">Open album <span aria-hidden="true">&nearr;</span></span>
                </div>
              </div>
              <figure class="moment-photo glass-surface">
                <img src="{versioned_asset(asset_folder(album) / 'previews/cover.webp', COLLECTION)}" width="{album.get('cover_width', 960)}" height="{album.get('cover_height', 720)}" alt="{escape(album['cover_alt'], quote=True)}" {loading} decoding="async">
              </figure>
            </a>
          </li>'''


def main():
    albums = json.loads((ROOT / "moments/albums.json").read_text())["albums"]
    albums.sort(key=lambda item: date.fromisoformat(item["date"]), reverse=True)
    assert len({identifier(album) for album in albums}) == len(albums)
    for album in albums:
        photos = album["photos"]
        assert photos and len({photo["file"] for photo in photos}) == len(photos)
        for photo in photos:
            assert photo["layout"] in {"portrait", "wide", "landscape", "solo"}
            assert (asset_folder(album) / photo["file"]).is_file()
            assert (asset_folder(album) / "previews" / photo["file"]).is_file()
        assert (asset_folder(album) / "previews/cover.webp").is_file()
    source = COLLECTION.read_text()
    header = re.search(r"    <header>.*?</header>", source, re.S).group()
    footer = re.search(r"    <footer>.*?</footer>", source, re.S).group()
    cards = "\n".join(collection_card(album, index) for index, album in enumerate(albums))
    section = f'''      <section class="moments-journal" aria-label="Moments, newest first">
        <div class="moments-order" aria-hidden="true"><span>Latest moments</span><span>Older stories below &darr;</span></div>
        <!-- Generated from moments/albums.json by scripts/build_albums.py, newest shooting date first. -->
        <ol class="moment-list">
{cards}
        </ol>
      </section>'''
    updated, replacements = re.subn(r'      <section class="moments-journal".*?</section>', lambda _: section, source, count=1, flags=re.S)
    assert replacements == 1
    updated = re.sub(r'href="\.\./style\.css(?:\?[^\"]*)?"', lambda _: f'href="{versioned_asset(ROOT / "style.css", COLLECTION)}"', updated, count=1)
    updated = re.sub(r'src="\.\./glass-effects\.js(?:\?[^\"]*)?"', lambda _: f'src="{versioned_asset(ROOT / "glass-effects.js", COLLECTION)}"', updated, count=1)
    COLLECTION.write_text(updated)
    for index, album in enumerate(albums):
        page = album_path(album)
        page.parent.mkdir(parents=True, exist_ok=True)
        page.write_text(render_page(album, albums, index, header, footer))
    print(f"Rendered {len(albums)} albums and a newest-first Moments directory.")


if __name__ == "__main__":
    main()
