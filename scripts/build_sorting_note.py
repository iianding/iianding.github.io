"""Build the sorting note from original examples and concise algorithm metadata.

Run after editing sorting-examples.json, these descriptions or note assets.
The output is static HTML and classic scripts, including for file browsing.
"""
import json
import re
from html import escape
from pathlib import Path
from build_albums import ROOT, rebase, versioned_asset

PAGE = ROOT / 'notes/sorting/index.html'
SOURCE = ROOT / 'notes/index.html'
EXAMPLES = json.loads((ROOT / 'scripts/sorting-examples.json').read_text())
ALGORITHMS = [
    dict(id='bubble', name='Bubble sort', tag='Neighbourhood negotiations',
         intro='Compare neighbours and swap the ones out of order. Repeat until nobody moves. Very sociable; less impressive when the guest list grows.',
         best='O(n)', average='O(n²)', worst='O(n²)', space='O(1)', stable='Yes',
         note='The early-exit flag makes an already sorted list linear. Equal neighbours are never swapped.'),
    dict(id='selection', name='Selection sort', tag='One very deliberate choice',
         intro='Find the smallest remaining value and put it in the next position. Excellent at making decisions; determined to inspect everyone first.',
         best='O(n²)', average='O(n²)', worst='O(n²)', space='O(1)', stable='No',
         note='It makes at most n − 1 swaps, but still scans the unsorted part every time. Swapping can reorder equal keys.'),
    dict(id='insertion', name='Insertion sort', tag='Make room for one more',
         intro='Keep a sorted prefix, then slide each new value into its place. Like arranging playing cards, with slightly fewer accusations of cheating.',
         best='O(n)', average='O(n²)', worst='O(n²)', space='O(1)', stable='Yes',
         note='A good fit for small or nearly sorted lists. The held value lives temporarily outside the displayed array while neighbours shift.'),
    dict(id='shell', name='Shell sort', tag='A little distance helps',
         intro='Insertion sort starts with distant neighbours, then closes the gaps. Some awkward conversations are easier to resolve from across the room.',
         best='O(n log n)', average='Gap-dependent', worst='O(n²)', space='O(1)', stable='No',
         note='These examples halve the gap: ⌊n/2⌋, ⌊n/4⌋, …, 1. Bounds depend on that choice; there is no universal average bound for every gap sequence.'),
    dict(id='merge', name='Merge sort', tag='Divide, then politely reunite',
         intro='Merge small sorted groups into larger ones until the whole list agrees. Reliable teamwork, provided somebody brings an extra buffer.',
         best='O(n log n)', average='O(n log n)', worst='O(n log n)', space='O(n)', stable='Yes',
         note='These versions merge bottom-up and take the left value first on ties. The buffer uses linear space; no recursive stack is needed.'),
    dict(id='quick', name='Quicksort', tag='Everyone, pick a side',
         intro='Choose a pivot, partition around it, then sort each side. Usually quick; occasionally the pivot demonstrates poor leadership.',
         best='O(n log n)', average='O(n log n)', worst='O(n²)', space='O(log n) typical', stable='No',
         note='These teaching versions use the last value as a Lomuto pivot. Sorted or equal-key input can cause quadratic work and O(n) stack space; the average assumes suitably mixed input.'),
    dict(id='heap', name='Heapsort', tag='The top bunk belongs to the largest',
         intro='Build a max-heap, move its largest value to the end, and repair the heap. A strict hierarchy, with surprisingly predictable deadlines.',
         best='O(n) on equal keys', average='O(n log n)', worst='O(n log n)', space='O(1)', stable='No',
         note='The iterative sift-down stops when the parent is already large enough. Equal keys give linear best-case work; typical and worst-case work remain n log n.'),
    dict(id='radix', name='LSD radix sort', tag='Let the digits do the organising',
         intro='Group values by one byte at a time, from least significant to most significant. No neighbour debates, just an exceptionally organised filing system.',
         best='O(d(n + b))', average='O(d(n + b))', worst='O(d(n + b))', space='O(n + b)', stable='Yes',
         note='These are four stable byte passes (d = 4, b = 256). Flipping the sign bit handles signed 32-bit order. The demo scales decimals by 1,000 first; its first counter records digit inspections.'),
]
SAMPLE = [61, 14, 83, 32, 7, 56, 45, 92, 23, 68, 39, 11, 74, 28, 50]


def player(algorithm):
    key, name = algorithm['id'], algorithm['name']
    bars = ''.join(f'<span class="sort-bar-slot"><span class="sort-bar" style="--bar-height:{value}%;--bar-bottom:0%"></span><span class="sort-bar-label">{value}</span></span>' for value in SAMPLE)
    return f'''        <div class="sort-lab" data-sort-lab="{key}" aria-label="{name} interactive demo">
          <div class="lab-heading"><span>TRY A SMALL LIST</span><span class="lab-state" data-state>Ready</span></div>
          <div class="sort-chart" role="img" aria-label="Unsorted example of 15 numbers" data-chart><div class="sort-bars" data-bars aria-hidden="true">{bars}<span class="zero-line"></span></div></div>
          <div class="lab-readout"><span class="lab-order-label">Current order</span><output class="sort-values" data-values>{', '.join(map(str, SAMPLE))}</output></div>
          <div class="lab-controls">
            <button class="button lab-start" type="button" data-action="start" disabled><span data-start-label>Start</span><span data-start-icon aria-hidden="true">▷</span></button>
            <button class="button" type="button" data-action="custom" aria-expanded="false" aria-controls="{key}-editor" disabled><span>Custom</span></button>
            <button class="button" type="button" data-action="shuffle" disabled><span>Randomise</span></button>
            <button class="button" type="button" data-action="reset" disabled><span>Reset</span></button>
            <label class="speed-control">Pace <select data-speed aria-label="{name} animation pace"><option value="220">Calm</option><option value="90" selected>Steady</option><option value="25">Quick</option></select></label>
          </div>
          <form class="custom-editor" id="{key}-editor" data-editor hidden novalidate>
            <label for="{key}-numbers">Your numbers, separated by commas</label>
            <textarea id="{key}-numbers" data-input rows="2" maxlength="320" spellcheck="false" autocomplete="off" aria-describedby="{key}-hint {key}-error">{', '.join(map(str, SAMPLE))}</textarea>
            <p class="input-hint" id="{key}-hint">1–20 numbers · absolute value below 1,000,000 · up to 3 decimal places</p>
            <p class="input-error" id="{key}-error" data-error role="alert"></p>
            <div class="editor-actions"><button class="button" type="submit"><span>Use these numbers</span></button><button class="button" type="button" data-action="cancel"><span>Cancel</span></button></div>
          </form>
          <div class="lab-bottom"><p class="lab-message" data-message>Fifteen numbers. Not yet a queue.</p><div class="lab-counts"><span>{'Digit reads' if key == 'radix' else 'Comparisons'} <b data-comparisons>0</b></span><span>Array writes <b data-writes>0</b></span></div></div>
          <p class="visually-hidden" data-announcement role="status" aria-live="polite"></p>
        </div>'''


def section(algorithm, index):
    key, name = algorithm['id'], algorithm['name']
    complexity = ''.join(f'<div><dt>{label}</dt><dd>{escape(algorithm[field])}</dd></div>' for label, field in [('Best', 'best'), ('Average', 'average'), ('Worst', 'worst'), ('Extra space', 'space'), ('Stable', 'stable')])
    tabs = ''.join(f'<button type="button" role="tab" id="{key}-tab-{language}" data-language="{language}" aria-selected="{str(language == "c").lower()}" aria-controls="{key}-code" tabindex="{0 if language == "c" else -1}">{label}</button>' for language, label in [('c', 'C'), ('cpp', 'C++'), ('python', 'Python'), ('java', 'Java')])
    code = ''.join(f'<span class="code-line">{escape(line) or " "}</span>' for line in EXAMPLES[key]['c'].splitlines())
    return f'''      <section id="{key}" class="sort-section glass-surface" data-algorithm="{key}" aria-labelledby="{key}-title">
        <div class="sort-section-heading"><span class="sort-number">{index:02}</span><div><p class="sort-kicker">{escape(algorithm['tag'])}</p><h2 id="{key}-title">{name}</h2></div><a class="section-up" href="#algorithms" aria-label="Back to sorting contents">↑</a></div>
        <p class="sort-intro">{escape(algorithm['intro'])}</p>
        <dl class="complexity-grid">{complexity}</dl>
        <p class="implementation-note">{escape(algorithm['note'])}</p>
{player(algorithm)}
        <details class="sort-code"><summary><span>Code, in your preferred dialect.</span><span class="code-language-badge" data-code-label>C</span></summary>
          <div class="code-tabs" role="tablist" aria-label="{name} code language">{tabs}</div>
          <div id="{key}-code" class="code-panel" role="tabpanel" aria-labelledby="{key}-tab-c" tabindex="0"><pre><code>{code}</code></pre></div>
        </details>
      </section>'''


def main():
    source = SOURCE.read_text()
    header = re.search(r'    <header>.*?</header>', source, re.S).group()
    footer = re.search(r'    <footer>.*?</footer>', source, re.S).group()
    header = rebase(header, SOURCE, PAGE).replace('aria-current="page"', 'aria-current="location"')
    footer = rebase(footer, SOURCE, PAGE)
    local_assets = [('sort-engine.js', 'SortLab'), ('code-examples.js', 'SortExamples'), ('sorting.js', 'SortUI')]
    scripts = '\n'.join(f'  <script src="{versioned_asset(PAGE.parent / asset, PAGE)}" defer></script>' for asset, _ in local_assets)
    contents = ''.join(f'<a href="#{a["id"]}">{a["name"]}</a>' for a in ALGORITHMS)
    body = '\n'.join(section(algorithm, index) for index, algorithm in enumerate(ALGORITHMS, 1))
    PAGE.write_text(f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Eight classic sorting algorithms, their complexity, lightweight interactive demos, and examples in C, C++, Python and Java. By Ian Ding.">
  <meta name="theme-color" content="#ffffff">
  <title>Eight sorts. One stubborn list. — Notes — Ian Ding</title>
  <link rel="stylesheet" href="{versioned_asset(ROOT / 'style.css', PAGE)}">
  <link rel="stylesheet" href="{versioned_asset(PAGE.parent / 'sorting.css', PAGE)}">
  <script src="{versioned_asset(ROOT / 'glass-effects.js', PAGE)}" defer></script>
  <script src="{versioned_asset(ROOT / 'community-config.js', PAGE)}" defer></script>
  <script src="{versioned_asset(ROOT / 'community.js', PAGE)}" defer></script>
{scripts}
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <div class="wrap">
{header}
    <main id="main" class="subpage sorting-note">
      <a class="back-link" href="../index.html">&larr; Back to Notes</a>
      <article aria-labelledby="page-title">
        <div class="page-intro">
          <p class="eyebrow">ALGORITHMS / A SMALL FIELD GUIDE</p>
          <h1 id="page-title">Eight sorts.<br>One stubborn list.</h1>
          <p class="lead">Eight ways to put numbers in order. None can organise my desktop.</p>
          <div class="note-meta"><time datetime="2026-11-04">4 November 2026</time><span>8 algorithms</span><span>4 code languages</span><button class="album-like glass-surface" type="button" data-album-like="note-eight-sorts-2026-11-04" data-album-title="Eight sorts. One stubborn list." aria-label="Give a heart to Eight sorts. One stubborn list."><svg class="heart-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg><span>Send a heart</span><span data-like-count>—</span></button></div>
        </div>
        <div class="sort-guide glass-surface" id="algorithms">
          <p class="eyebrow">PICK YOUR DETOUR</p><nav class="sort-contents" aria-label="Sorting algorithms">{contents}</nav>
          <p>Each demo starts with the same 15 random numbers. Try your own list with <strong>Custom</strong>, then press <strong>Start</strong>. One demo runs at a time; the others are very good at waiting. Your numbers stay in your browser.</p>
          <p class="guide-small"><strong>Reading the numbers:</strong> n is the list length; d is the number of digit passes; b is the bucket count. Stable sorts preserve the original order of equal keys. Extra space excludes the input but includes buffers and call stacks.</p>
          <p class="guide-small">Code examples modify the supplied list of signed 32-bit integers. Demos also accept negative numbers and up to three decimal places. Animations explain steps rather than benchmark speed; radix digit reads are not neighbour comparisons.</p>
          <noscript><p>JavaScript is needed for demos and language switches. The explanations and C examples are still here for a quiet read.</p></noscript>
        </div>
{body}
        <aside class="sorting-afterword glass-surface" aria-labelledby="afterword-title"><p class="eyebrow">AFTER THE NUMBERS HAVE SETTLED</p><h2 id="afterword-title">The best sort depends on the list.</h2><p>Nearly sorted? Insertion may be perfectly happy. Need a stable guarantee? Merge has a spare buffer. Tight on space? Heap travels light. These are teaching implementations; standard-library sorts have considerably more experience.</p><p class="guide-small">References for another open tab: <a href="https://algs4.cs.princeton.edu/cheatsheet/" target="_blank" rel="noopener noreferrer">Princeton’s algorithm summary</a>, <a href="https://xlinux.nist.gov/dads/HTML/shellsort.html" target="_blank" rel="noopener noreferrer">NIST on Shell sort</a>, <a href="https://xlinux.nist.gov/dads/HTML/bubblesort.html" target="_blank" rel="noopener noreferrer">NIST on bubble sort</a>, and <a href="https://algs4.cs.princeton.edu/51radix/" target="_blank" rel="noopener noreferrer">Princeton’s radix-sort chapter</a>.</p></aside>
      </article>
      <nav class="page-links" aria-label="Note navigation"><a href="../index.html">&larr; All notes</a><a href="#page-title">Back to top ↑</a></nav>
    </main>
{footer}
  </div>
</body>
</html>
''')
    print('Rendered one sorting note with 8 demos and 32 language examples.')


if __name__ == '__main__':
    code_js = '(function(root){{\n  "use strict";\n  const examples = {};\n  if (typeof module === "object" && module.exports) module.exports = examples;\n  else root.SortExamples = examples;\n}})(typeof globalThis === "object" ? globalThis : this);\n'
    (PAGE.parent / 'code-examples.js').write_text(code_js.format(json.dumps(EXAMPLES, separators=(',', ':'))))
    main()
