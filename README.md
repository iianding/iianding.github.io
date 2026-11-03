# iianding.github.io
Personal website.

## Page structure

Every page has its own directory and an `index.html` entry. Child pages nest under their parent section; this rule continues at every depth. Only the homepage stays at the repository root.

```text
index.html
now/
  index.html
  semester-1/
    comp516/index.html
    comp518/index.html
    comp526/index.html
    comp528/index.html
notes/index.html
projects/index.html
moments/index.html
```

Use explicit relative page links such as `now/index.html` or `now/semester-1/comp516/index.html`. Folder-only links can open a directory when the homepage is opened directly from disk. Explicit filenames support both local file browsing and GitHub Pages. Shared site styles, scripts and icons remain at the root or in the shared asset directories.

## Moments

Published albums and travel entries are listed in `moments/index.html`, newest first.

```text
moments/
  index.html                  # Public Moments directory
  albums.json                 # Album metadata and curated photo sequences
  album.css
  album.js
  _templates/                 # Draft page layouts, not listed publicly
    liverpool-gallery/
      index.html
  liverpool/
    2026-07-08/
      index.html              # Album page
memory_image/
  liverpool/
    2026-07-08/
      DSC02131-20260708.webp   # Full web-sized photograph
      previews/
        DSC02131-20260708.webp
        cover.webp            # Cropped Moments directory cover
```

For the next photo album, create matching city/date asset folders and keep the camera filenames. Add the English title, description, shooting date, cover choice and ordered photographs to `moments/albums.json`, then run `python3 scripts/build_albums.py`. The script generates the album pages, the newest-first Moments list and the newer/older album links. The generated HTML works directly from disk and on GitHub Pages without a server-side build. Use the shooting date, not the upload date.

For a travel article, copy an `index.html` draft from `moments/_templates/<template-name>/` and update all relative asset and navigation links for its depth. Each further child page also gets a child folder with its own `index.html`.

Album images use small previews during browsing and load the larger web-sized file when opened. Keep original source backups outside the published website.

The generated album pages and Moments directory include content versions for their shared styles and scripts. Re-run `python3 scripts/build_albums.py` after changing those assets so browsers load the updated appearance and interactions. Photo pages use a slightly lighter glass header to keep navigation readable over dark photographs.
