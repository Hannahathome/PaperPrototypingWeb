# Plan

Web versions of the [PaperPrototyping](https://github.com/Hannahathome/PaperPrototyping)
tools, plus tutorials, on one Astro Starlight site. The web apps are **basic versions**:
core functions only. The Processing repo stays the full version.

Accuracy comes first: output is printed and cut on a vinyl cutter, so every phase that
produces geometry ends with a physical check, not only green tests. The architecture rules
that apply throughout are in [CLAUDE.md](CLAUDE.md).

**Order.** PaperPolyhedra goes first (decided with Hannah, 2026-09-25), because it is the main
tool and the others build on it. It was originally Phase 5, after FrustumSupport.

## Phase 0: setup (done)

Astro Starlight + TypeScript + Vitest, folder layout, `src/data/tools.json`, home page with
tool cards, one page per tool, tutorial template and guide, GitHub Pages deploy that is
blocked by failing tests, and this plan.

## Phase 1: shared foundation

- `src/lib/units`: millimetres everywhere; any DPI conversion a cutter genuinely needs lives
  in one tested function here.
- SVG exporter in physical mm (`width="280mm"`, viewBox in mm).
- jsPDF exporter in `mm` units, including placing raster artwork at a fixed DPI.
- The three-file export convention: `<name>_<stamp>.pdf`, `<name>_fold_<stamp>.svg`,
  `<name>_calib_<stamp>.svg`, stamp `M_D_H_MM_SS`.
- Calibration marks, matching Processing exactly: crosses centred 10 mm in from each corner
  of the 280 × 200 mm cutting area, 4 mm long in the PDF and 20 mm long in the calibration
  SVG, sharing the top-left origin with the A4 page.
- File upload/download helpers.
- A *calibration test sheet* page for the physical check.

**Done when** the calibration sheet prints and cuts to size.

## Phase 2: PaperPolyhedra basic

### Scope (agreed with Hannah)

In:

- Uniform prisms and frustums with 3 or more sides, set by top perimeter, bottom perimeter
  and height (inputs are **perimeters**, as in Processing).
- Tab depth, flap depth and flap taper; the side flap and hook tab that close the strip;
  arrowhead tabs on the lids.
- Top and bottom lids.
- Colour and images: a fill colour, one image per panel, one image bent across the whole
  strip, and images on the top and bottom lids.
- One shape per export, on A4 landscape.
- A flat sheet preview and a rotatable three.js 3D preview.
- The three-file export (PDF, fold SVG, calibration SVG).

Out (the Processing version does these): per-edge and cuboid shapes, Kresling patterns,
JSON import, whole-surface wrap, markers, base plates, cutouts, connections, assemblies,
split strips, hollow/inner shapes, repeats and several shapes per sheet, A3–A1 pages.

### Steps

1. **Reference exports.** A small harness sketch (kept in this repo under
   `scripts/fixtures/paperpolyhedra/`) is run with `processing-java` against a *copy* of
   PaperPolyhedra in a temporary folder; the PaperPrototyping repo is never modified. It
   exports a fixed set of shapes into `tests/fixtures/paperpolyhedra/`:
   triangle, square, pentagon and hexagon prisms, a frustum and an inverted frustum, plus
   one non-default tab/flap setting. Each fixture is stored with the exact parameters used.
2. **Core** (`src/tools/paperpolyhedra/core/`, pure functions, mm only):
   polygon maths (perimeter ↔ side ↔ circumradius ↔ apothem); the panel strip with slant
   height for frustums and the rotation chain between panels; flap, hook tab and arrowhead
   tabs; lids; page layout (strip at 10 mm / 20 mm from the origin, lids below it, as in
   Processing) with a warning when anything leaves the 280 × 200 mm cutting area. Output is
   a list of paths, each tagged `cut`, `fold` or `print`, plus the panel and lid shapes that
   images are mapped onto.
3. **Match with Processing.** Parse the fixture SVGs, convert with Processing's own scale,
   and compare cut and fold segments with ours at 0.1 mm tolerance.
4. **Export:** fold SVG (cut lines solid, fold lines dashed 1.2 mm on / 1.2 mm off, as in
   Processing), calibration SVG, and PDF (colour and images rasterised at 300 DPI, outline
   and calibration crosses as vectors). Export-dimension tests parse the files and check
   their physical size.
5. **Images:** per-panel and strip images mapped onto the trapezoids with the same
   tessellation Processing uses, so artwork lands where it does there; lid images mapped
   onto the lid polygon. Image upload stays in the browser (nothing is sent anywhere).
6. **App page** `src/pages/apps/paperpolyhedra/`: inputs, live SVG sheet preview, three.js
   preview of the folded shape, export button. The UI only displays what the core returns.
7. **Physical check** (`docs/checklist-paperpolyhedra.md`): print at actual size, measure
   perimeter and height, cut, fold, and check that it closes and the lids seat.
8. **Tutorial** "Make your first shape", and the tool card switches to *available*.

**Done when** the fixture tests pass, and a printed and cut triangle prism, hexagon prism
and frustum fold closed with lids that fit.

### Hidden behaviour found so far

To be added to [docs/hidden-behaviour.md](docs/hidden-behaviour.md), each with a test:

- The PDF is the full 297 × 210 mm page; both SVGs are the 280 × 200 mm cutting area. All
  three share the top-left origin.
- Processing truncates the SVG canvas to whole pixels (1058 × 755 px for 280 × 200 mm), so
  its cut files are about 0.025 % large (≈ 0.07 mm over 280 mm). The web version is exact;
  the fixture comparison uses Processing's intended scale.
- Fold dashes are `3 mm × 0.4`: 1.2 mm dash, 1.2 mm gap.
- Strip images map image row 0 onto the model's *bottom* rim (the opposite of the wrap mode).
- Lid polygons start at `−90° − 180°/n`, so one edge is horizontal.

## Phase 3: FrustumSupport

Its output is OpenSCAD text, which can be tested exactly. Basic scope: frustum parameters,
edge radius, cuboid rigs, a three.js preview and `.scad` download. Tests compare against
Processing reference output in `tests/fixtures/frustumsupport/`.

## Phase 4: PaperPhicons

Cuboid nets, ArUco markers drawn as vector squares from the dictionary (not taken from the
PNG sheets), and the three-file export. The physical check includes testing that a camera
detects the markers.

## Phase 5: DataPhysicalisation

CSV upload, column mapping, scale controls, a three.js view and JSON export. The JSON must
stay compatible with the PaperPolyhedra import; the files in `DataPhysicalisation/examples/`
become fixtures. Then add JSON import to the PaperPolyhedra web app, so the two connect in
the browser.

## Phase 6: ScaffoldShell basic and the visualisation tools

ScaffoldShell reuses the cores from Phases 2 and 3, so nothing is ported twice.
WidgetGenerator and other visualisation tools go under their own section. PaperBlox is
covered by the PaperPolyhedra basic version; its card can point there.

## Throughout

Every app ships with tests and at least one tutorial.
