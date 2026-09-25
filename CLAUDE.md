# PaperPrototypingWeb

Astro Starlight site with tutorials and browser versions of the PaperPrototyping tools,
published to https://hannahathome.github.io/PaperPrototypingWeb/. The phased plan is in
[PLAN.md](PLAN.md).

## Reference repo (read only)

The Processing originals are in `C:\Users\20167196\Documents\GitHub\PaperPrototyping`
(github.com/Hannahathome/PaperPrototyping). **Read it for reference; never modify it.**
Start with its `README.md` and `docs/shared-concepts.md`.

The TEI'27 tools (PLAN.md, Phase 7) come from `C:Users67196DocumentsGitHubTEI27Software`,
a local folder that is not a git repo and not on GitHub. Read it for reference only; never
modify it. Tools ported from it have `processingUrl: null` and a `sourceNote` in `tools.json`.

## Commands

```bash
npm install      # once
npm run dev      # dev server at http://localhost:4321/PaperPrototypingWeb/
npm test         # Vitest, once
npm run test:watch
npm run build    # astro check (types) + astro build + scripts/check-links.mjs
npm run preview  # serve dist/
```

For a dev server that doesn't block the terminal: `npx astro dev --background`, then
`npx astro dev stop` / `status` / `logs`.

## Stack

Astro Starlight, TypeScript, Vitest, npm. Later phases: three.js for 3D previews, SVG for 2D
previews, jsPDF (`unit: 'mm'`) for PDF export. No UI framework (React, Vue, …) unless clearly
needed; Starlight plus plain TypeScript is enough. Keep dependencies minimal.

## Architecture rules

1. **Separate the core from the UI.** Each tool has `src/tools/<tool>/core/`, pure functions
   (parameters in, geometry in millimetres out, no DOM), and `src/tools/<tool>/ui/`, which
   only displays what the core returns. Only the core is unit-tested.
2. **Millimetres until export.** All geometry is in mm. SVGs use physical units
   (`width="297mm"`, viewBox in mm). The Processing code's `MM` (72 DPI) and `MM_V` (96 DPI)
   scale factors must not spread through the code. If a cutter genuinely needs a DPI
   conversion, it lives in one tested function in `src/lib/`.
3. **Export convention** (from shared-concepts.md): the print PDF is `<name>_<stamp>.pdf`, the
   cut file `<name>_fold_<stamp>.svg` and the registration file `<name>_calib_<stamp>.svg`,
   with the stamp `M_D_H_MM_SS`.
4. **Four test layers:**
   - unit tests for geometry;
   - a match with Processing: web output is compared against reference exports from the
     Processing version, stored in `tests/fixtures/<tool>/`, with a 0.1 mm tolerance;
   - export-dimension tests: parse the exported SVG/PDF and check its physical size;
   - a manual physical checklist per tool: print at actual size, measure, cut.
5. **Deploys are blocked by failing tests.** `.github/workflows/deploy.yml` runs test, then
   build, then deploy. Pull requests run test and build only.
6. **Record hidden behaviour.** Any non-obvious behaviour found in the Processing code (for
   example the rotation correction `−90 − 180/n` between PaperPolyhedra and OpenSCAD, or
   radius vs perimeter) gets a test and a note in [docs/hidden-behaviour.md](docs/hidden-behaviour.md).

Accuracy is the top priority: output is printed and cut, so physical dimensions must be exact.

## Layout

```
src/content/docs/            Starlight pages (published)
  index.mdx                  home page: intro + tool cards
  tools/<id>.mdx             one page per tool
  tutorials/<id>/*.md        tutorials, one folder per tool id
  tutorials/_template.md     tutorial template (underscore = not published)
  contributing/              guides for Hannah (e.g. how to add a tutorial)
src/pages/apps/<id>/         one Astro page per web app (later phases)
src/components/              Astro components for cards, tool pages, tutorial lists
src/lib/                     shared code: units, export, file I/O, paths
src/tools/<id>/core|ui/      per-tool core and UI
src/data/tools.json          tool metadata (typed in src/data/tools.ts)
tests/                       Vitest tests; tests/fixtures/<id>/ for Processing reference exports
scripts/check-links.mjs      post-build link check
docs/                        developer notes (not published)
```

## Shared library (`src/lib/`)

- `units.ts`: page sizes (`A4_LANDSCAPE`, `CUT_AREA` 280 × 200 mm) and `mmToPx`/`pxToMm`,
  the only mm conversions in `src/`.
- `drawing.ts`: the model every tool core returns: a `Sheet` of `Path`s (`cut` | `fold` |
  `print`), `Label`s and `RasterImage`s, all in mm, origin top-left, y down.
  `toCutterPaths` turns fold paths into real dash segments (Processing's `drawDashedLine`);
  cutter software ignores `stroke-dasharray`, so never rely on it.
- `svg.ts` (cutter SVG in mm), `pdf.ts` (jsPDF, A4, mm), `calibration.ts` (crosses),
  `export.ts` (names, stamp, `buildExportFiles`, `fitsCutArea`), `files.ts` (browser
  download/upload), `preview.ts` (on-screen sheet preview), `paths.ts` (`withBase`).

A tool core builds a `Sheet`; `buildExportFiles(sheet, name)` gives the three files. Processing's
`MM`/`MM_V` constants live only in `tests/helpers/processing.ts`, for reading fixtures.

## Tool metadata

`src/data/tools.json` drives the home page cards, the sidebar and the tool page headers.
Fields: `id` (lowercase slug, also the URL and tutorial folder name), `name`, `category`
(`maker` | `visualisation`), `status` (`planned` | `in-progress` | `available`),
`description`, `processingUrl`, `appPath` (e.g. `apps/frustumsupport/`; null while
`planned`, required when `available`, optional while `in-progress`, when the card shows
"Open web app (beta)"), `tutorials`. A tool becomes `available` only after its physical check.

Tutorials are **discovered from the folder** `src/content/docs/tutorials/<id>/`, so Hannah can
add one without editing JSON. The `tutorials` array is currently unused and always empty.

Adding a tool: add an entry to `tools.json` and a page `src/content/docs/tools/<id>.mdx`
whose `title` equals the tool's `name` (a test checks both).

## Links and the base path

The site is served under `/PaperPrototypingWeb/`.

- In `.astro`/`.ts` code, build internal URLs with `withBase()` from `src/lib/paths.ts`.
- In Markdown, use relative links (`../other-tutorial/`); a leading `/` skips the base.
- App pages in `src/pages/apps/` should use Starlight's `<StarlightPage>` component to keep
  the site layout.

`npm run build` ends with `scripts/check-links.mjs`, which fails if any internal href/src in
`dist/` is outside the base, points to a missing file or to a missing `#id`.

## Content rules enforced by tests

- Images under `src/` and `public/` must be ≤ 500 KB.
- No video files in the repo; embed from YouTube/Vimeo (`<iframe class="video" …>`).
- Every folder in `tutorials/` must be a tool id from `tools.json`.

## Git

Work on a branch and commit in logical steps. Ask before pushing and before merging to `main`
(pushing to `main` publishes the site).
