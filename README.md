# Português · 1000 palavras

A simple offline practice app for European Portuguese, built from `resources/1000 Palavras Mais Comuns.pdf`.

Open `index.html` in a browser (no server needed), or use the hosted version on GitHub Pages.

- **Sections** (sidebar) follow the PDF order. Every word has an example sentence; click a sentence to see the English.
- **Verbos**: one lesson per verb with a conjugation table, examples, notes, practice and a recap.
- **Tempo** (top right) switches the tense everywhere. It's remembered between visits.
- **Praticar**: a random mixed drill (fill in the conjugation, translate, conjugation tables, free write). Nothing is graded; reveal the suggested answers when you're ready.
- **Flashcards**: tick one or more decks and pick a direction. <kbd>Space</kbd> flips, <kbd>h</kbd>/<kbd>p</kbd>/<kbd>←</kbd> previous, <kbd>l</kbd>/<kbd>n</kbd>/<kbd>→</kbd> next, <kbd>1</kbd> = again, <kbd>2</kbd> = got it. On a phone: tap to flip, swipe to move. Progress (Leitner boxes) is saved in the browser.
- **☰** hides or shows the sidebar; ▸ expands a section's sub-groups.

## Editing content

Content lives in `data/source/*.json` (the format is described in `data/source/AUTHORING.md`). After editing, rebuild:

    python3 tools/build_data.py

This validates everything and regenerates `data/data.js`.
`tools/extract_pdf.py` re-extracts the PDF text into `data/source/raw.txt`.

## On your phone (GitHub Pages)

The site is static, so GitHub Pages can host it as is: Settings → Pages → Deploy from a branch → `main` / root.
Open `https://<user>.github.io/<repo>/` on the phone and choose **Share → Add to Home Screen**. It then opens full-screen and works offline (`sw.js` caches it).

To update: edit, run `python3 tools/build_data.py`, then commit and push. The phone picks up changes the next time it's online.
Progress and settings live in each browser's local storage, so the phone and the laptop keep separate progress.

The PDFs in `resources/` and the extracted text (`data/source/raw.txt`) are git-ignored and never published.
`tools/make_icons.py` regenerates the app icons.
# Palavras
