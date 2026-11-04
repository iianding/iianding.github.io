# GitHub workflow

- Make local edits and checks by default. Create commits or push to GitHub only when the user explicitly requests it for the current change; earlier publishing requests do not authorize later commits or pushes.

# Website content

- Keep all visitor-facing website content in English, including navigation, captions, placeholders, page metadata, and accessibility labels. This applies to future additions and edits.
- Keep detailed research and module overviews inside their individual course pages. The Now page retains its original short, humorous course introductions, without a separate research-progress card, unless the user requests a different arrangement.

# Page hierarchy

- Keep only the homepage `index.html` at the repository root. Every other HTML page, including draft templates, must have its own folder with an `index.html` entry file.
- Nest child pages inside their parent section's directory, recursively. Section landing pages live at `now/index.html`, `notes/index.html`, `projects/index.html` and `moments/index.html`.
- Semester 1 course notebooks live at `now/semester-1/<course-code>/index.html`; future notes inside a course must use another child folder with its own `index.html`.
- Use explicit relative links to each page's `index.html`, such as `./now/index.html`, rather than folder-only links. The user opens the homepage directly from disk, so navigation must work both with local `file://` URLs and on GitHub Pages. When moving or adding pages, verify navigation, parent links, anchors, shared styles/scripts and image paths at every nesting depth.
- Preserve phone, tablet and desktop layouts. Keep touch controls usable, allow enlarged text to fit, retain readable backgrounds when glass blur is unsupported, and keep mouse-following light disabled for touch-only and reduced-motion users. Do not claim real-device verification when browser access is unavailable.

# Moments and photographs

- The user requires all website content to be in English. Translate Chinese content briefs into natural English titles and descriptions before publishing them in the website.
- List real Moments entries newest first by the actual shooting or travel date. Never invent dates for draft entries.
- Keep album titles, descriptions, dates, cover choices and photo sequences in `moments/albums.json`. Run `python3 scripts/build_albums.py` after edits to regenerate relative page links, the newest-first listing and adjacent-album navigation. This generates static HTML, so local browsing needs no server.
- Store each album or travel page at `moments/<city>/<YYYY-MM-DD>/index.html`.
- Store its photographs at `memory_image/<city>/<YYYY-MM-DD>/`, retaining the camera filenames. Put resized previews and the directory cover in that album's `previews/` subfolder.
- Prepare future photo assets from backed-up originals, using a maximum long edge of 2160px for full-frame WebP photographs, 1080px for previews, and 864×648px for directory covers. Preserve compositions and colour, and visually inspect detail after compression. Do not repeatedly recompress existing web assets. Keep dimensions in `moments/albums.json` in sync with the files.
- Keep unused page templates at `moments/_templates/<template-name>/index.html`, outside the public Moments list. Shared album styles and interactions live at `moments/album.css` and `moments/album.js`.
- Preserve full photograph compositions in the full-frame viewer. Directory covers and desktop pairings may crop for balance; mobile photo stacks should show natural proportions.
- Re-run the album generator after changing shared styles or scripts as well as album metadata: generated asset URLs include content versions to avoid stale browser caches. Retain the `photo-journal` body class on the Moments directory and album pages so navigation remains readable above photographs.
- Keep the existing clear rounded glass material, pointer reflections, accessible navigation and reduced-motion behavior when adding albums.

# Visitors and hearts

- Shared visitor totals and repeatable album hearts are stored by the separate `../website-community-service` project, hosted through Sites with D1. `community-config.js` contains only its public URL; never put API keys or credentials in browser code.
- Keep one anonymous browser ID across pages. Page views count page loads, while visitors are deduplicated. Monthly visitors use the server's `Europe/London` calendar month; all-time visitors and hearts must never reset with the month.
- Every click may add another heart. Use idempotent event IDs so request retries cannot duplicate a click. Keep the cover and both album-page buttons in sync, and keep buttons outside the album-opening link.
- The footer in `moments/index.html` is the shared source. `scripts/build_albums.py` rebases it onto every page and refreshes the shared asset versions. Generated albums inherit their heart controls automatically, including future albums.
- When adding an album, also sync its ID, title, location, date and page path into `../website-community-service/app/admin/albums.json` and publish that service before the new album's heart controls go live. This catalog supplies the private dashboard and restricts writes to published albums.
- Localhost uses the local database service on port 5173. Do not send local QA visits or likes to production. File browsing keeps the static site usable and displays no invented counts. Draft templates must not register visits.
- Notes can reuse the same heart controls and tables with an allowed dated ID such as `note-eight-sorts-2026-11-04`. Register note metadata in `../website-community-service/app/admin/notes.json`; publishing frontend and backend changes still requires the user's explicit instruction.

# Sorting note

- The note lives at `notes/sorting/index.html`. Run `python3 scripts/build_sorting_note.py` after changing its descriptions, examples or local assets. `scripts/sorting-examples.json` is the source for all 32 examples; the generated classic script must also work with file browsing.
- Keep the demos dependency-free and local to the browser. Limit each list to 20 values, magnitude below 1,000,000 and at most three decimal places. Only one lazy step generator and one timer may run at a time; pause when hidden or off screen. Do not add background polling or server execution for sorting.
- Use the stated variants consistently: early-exit bubble, ordinary selection/insertion, halving-gap Shell, bottom-up stable merge, last-pivot Lomuto quicksort, iterative heap and stable four-byte signed radix. Explain space, stability and variant-dependent bounds accurately.
