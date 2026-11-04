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
  sorting/index.html
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

Current photo sizes are capped at 2160px on the long edge for full-frame WebP files and 1080px for previews; directory covers are 864×648px. Use original source photographs when preparing future additions. The album's photo order, crop choices and desktop pairings are curated independently of these file sizes.

The generated album pages and Moments directory include content versions for their styles, scripts and photographs. Re-run `python3 scripts/build_albums.py` after changing those assets so browsers load the updated files. Photo pages use a slightly lighter glass header to keep navigation readable over dark photographs.

## Visitors and album hearts

The footer shows all-time visitors, visitors in the current UK calendar month, and page views. Browser IDs are anonymous; revisiting pages adds views without adding another visitor. The month switches automatically on the 1st in `Europe/London`. Counts begin when the integration goes live; earlier website traffic is not reconstructed. Clearing browser storage or using another device can create another visitor.

Every album has a glass heart button on its cover and two inside its page. Each click can add a heart. The buttons use the same album key and shared online count. Network retries reuse event IDs, so one queued click is not counted twice. Future generated albums work automatically.

Persistent data is kept by the separate `../website-community-service` Sites project, not in the Git repository or browser storage. `community-config.js` holds the production service address and a separate loopback preview address. The service must allow anonymous visitors for the public GitHub Pages site to use it; it exposes aggregate counts and add-heart actions, not database management access.

The common footer lives in `moments/index.html`. Run the album generator after editing it or the community scripts to update every page. Local HTTP previews use the local database on port 5173; file previews display dashes and disable hearts rather than inventing online statistics.

## Sorting note

`notes/sorting/index.html` contains eight algorithm explanations, complexity and stability notes, four language examples per algorithm, and dependency-free demos. Each demo starts with the same 15 random values and accepts 1–20 comma-separated numbers, magnitude below 1,000,000, with at most three decimal places. Only one lazy step generator runs at once. Animations pause off screen, when the tab is hidden or when the page is left; sorting never calls a server.

Edit descriptions in `scripts/build_sorting_note.py` and the original examples in `scripts/sorting-examples.json`, then run `python3 scripts/build_sorting_note.py`. This regenerates the HTML, classic examples script and asset versions. Shared asset changes should be followed by this generator as well as the album generator.

Run `node scripts/check_sorting.cjs` for parser and animation-engine checks. Run `python3 scripts/check_sorting_examples.py --java-home /path/to/jdk` to compile and execute all 32 examples using clang, clang++ and a JDK. Compilers and generated binaries are check tools only and do not enter the website.

The article heart uses the existing community API and database tables with the separate key `note-eight-sorts-2026-11-04`. Its metadata is registered in the service's `app/admin/notes.json`. Publish the service allowlist before the frontend when publication is explicitly requested; local edits do not authorize commits, pushes or deployment.
