# Plan

Web versions of the [PaperPrototyping](https://github.com/Hannahathome/PaperPrototyping)
tools, plus tutorials, on one Astro Starlight site. The web apps are **basic versions**:
core functions only. The Processing repo stays the full version.

Accuracy comes first: output is printed and cut on a vinyl cutter, so every phase that
produces geometry ends with a physical check, not only green tests. The architecture rules
that apply throughout are in [CLAUDE.md](CLAUDE.md).

## Phase 0: setup

Astro Starlight + TypeScript + Vitest, folder layout, `src/data/tools.json`, home page with
tool cards, one page per tool, tutorial template and guide, GitHub Pages deploy that is
blocked by failing tests, and this plan.

## Phase 1: shared foundation

- `src/lib/units`: millimetres everywhere; any DPI conversion a cutter genuinely needs lives
  in one tested function here.
- SVG exporter in physical mm (`width="297mm"`, viewBox in mm).
- jsPDF exporter in `mm` units.
- The three-file export convention: `<name>_<stamp>.pdf`, `<name>_fold_<stamp>.svg`,
  `<name>_calib_<stamp>.svg`, stamp `M_D_H_MM_SS`.
- File upload/download helpers.
- A *calibration test sheet* page for the physical check.

**Done when** the calibration sheet prints and cuts to size.

## Phase 2: FrustumSupport

Chosen first because its output is OpenSCAD text, which can be tested exactly.

Basic scope: frustum parameters, edge radius, cuboid rigs, a three.js preview and `.scad`
download. Tests compare against Processing reference output in `tests/fixtures/frustumsupport/`.

## Phase 3: PaperPhicons

Cuboid nets, ArUco markers drawn as vector squares from the dictionary (not taken from the
PNG sheets), and the three-file export. The physical check includes testing that a camera
detects the markers.

## Phase 4: DataPhysicalisation

CSV upload, column mapping, scale controls, a three.js view and JSON export. The JSON must
stay compatible with the PaperPolyhedra import; the files in `DataPhysicalisation/examples/`
become fixtures.

## Phase 5: PaperPolyhedra basic (effectively PaperBlox)

The feature list is agreed with Hannah before starting. Then connect DataPhysicalisation to
PaperPolyhedra in the browser.

## Phase 6: ScaffoldShell basic and the visualisation tools

ScaffoldShell reuses the cores from Phases 2 and 5, so nothing is ported twice.
WidgetGenerator and other visualisation tools go under their own section.

## Throughout

Every app ships with tests and at least one tutorial.
