# Hidden behaviour in the Processing tools

Non-obvious behaviour found in the Processing code that the web versions must reproduce (or
deliberately correct). Every entry gets a test once the code it concerns is ported; the
**Test** line points to it. Source: the PaperPrototyping repo, unless noted.

## Export files (all print-and-cut tools)

### Page sizes and shared origin

The PDF is the printed page; both SVGs are only the 280 × 200 mm cutting area. All three
share the top-left origin, so a point at (x, y) mm is at the same place on print and cut.

- Source: `PaperPolyhedra/Param.pde` (`PRINT_W/H`, `VINYL_W/H`), `PrintNCut.pde`
- Test: `tests/lib/export.test.ts`, `tests/tools/calibration/sheet.test.ts`

### Processing's PDF page is slightly smaller than A4

Processing creates the PDF canvas as `(int)(297 · MM) × (int)(210 · MM)` = 841 × 595 pt,
i.e. 296.7 × 209.9 mm (checked: `/MediaBox[0 0 841 595]` in a real export). A4 is
841.89 × 595.28 pt. The artwork itself is drawn at `MM = 2.8346` px/mm, 0.0016 % short of
72/25.4, which is negligible. The web version writes a true A4 page; if a printer centres the
page, the two differ by about 0.15 mm.

- Test: `tests/lib/pdf.test.ts` (web PDF is exactly A4)

### Processing's SVG viewBox is truncated to whole pixels

The cut SVGs are drawn at `MM_V` ≈ 3.7795 px/mm, but `fixSVGPhysicalDimensions` writes
`viewBox="0 0 1058 755"` (truncated from 1058.27 × 755.89) with `width="280mm"
height="200mm"`. A viewer that honours the viewBox scales by 280/1058 and, because the aspect
ratios differ slightly, centres the content vertically: Processing's cuts come out ≈ 0.025 %
large (0.07 mm over 280 mm) and ≈ 0.1 mm lower. The web SVGs use a viewBox in mm, so there
is no rounding. Fixture comparisons read Processing's SVGs at `MM_V`, its intended scale.

- Test: `tests/lib/calibration.test.ts` (matches the Processing crosses within 0.1 mm)

### Calibration crosses

Centred 10 mm in from each corner of the 280 × 200 mm cutting area: (10, 10), (270, 10),
(10, 190), (270, 190). Printed crosses are 4 mm across at 1 pt; cut crosses are 20 mm across.
The cut crosses are drawn from the corner edge inwards (e.g. x 280 → 260), which does not
matter for cutting.

- Source: `PrintNCut.pde`, `drawCalibCrosses()` and `drawCalibCrosses_V()`
- Test: `tests/lib/calibration.test.ts`, compared against a real Processing export in
  `tests/fixtures/calibration/`

### Fold lines are real dashes, not a dash style

`drawDashedLine` draws each dash as a separate line: a 1.2 mm gap at the start (`3 mm × 0.4`),
dashes of 1.2 mm with 1.2 mm gaps, and no dash may enter the last 1.2 mm. The last dash is
shortened only if it would reach that final gap, so the end gap is between 1.2 and 3.6 mm.
Lines of 2.4 mm or less get no dashes at all. Cutter software ignores `stroke-dasharray`,
so the web version writes real segments too, on both the SVG and the PDF.

- Source: `tools.pde`, `drawDashedLine()`; `Param.pde`, `FOLD_DASH_SCALE`
- Test: `tests/lib/drawing.test.ts`, `tests/tools/calibration/sheet.test.ts`

### Timestamp padding

The convention is `M_D_H_MM_SS`, but Processing builds it from `minute()` and `second()`
without zero-padding (`9_18_13_5_7`). The web version pads minutes and seconds
(`9_18_13_05_07`), so files sort correctly.

- Source: `PaperPolyhedra.pde`, `exportPlan()`
- Test: `tests/lib/export.test.ts`

## Radius vs perimeter

PaperPolyhedra is driven by *perimeters and per-edge widths*; FrustumSupport by
*circumradii*. For a regular n-gon with circumradius R:

```
perimeter = 2 · n · R · sin(π/n)
R         = perimeter / (2 · n · sin(π/n))
```

A frame specified in the wrong quantity will not seat inside its shell.

- Source: `docs/shared-concepts.md`, "Radii vs perimeters"
- Test: `tests/tools/paperpolyhedra/geometry.test.ts` (circumradius round trip); the
  FrustumSupport conversion gets its own test in Phase 3

## Rotational phase between PaperPolyhedra and OpenSCAD

PaperPolyhedra's polygon walk puts *edge zero's midpoint* at −90°; the OpenSCAD modules put
*vertex zero* at 0°. Correction: rotate by `−90 − 180/n` degrees. Invisible at n = 4, tens of
millimetres out at n = 3 and n = 5.

- Source: `docs/shared-concepts.md`; `ScaffoldShell/Frame.pde`
- Test: pending (Phase 6, ScaffoldShell), with cases for n = 3, 4, 5

## Print scale vs cut scale

Print geometry uses `MM = 2.8346` (72 DPI), cut geometry `MM_V = MM · 96/72` (96 DPI). Mixing
them is 33 % wrong on the cutting mat. The web version works in mm and emits physical units,
so these constants should not appear outside one tested conversion in `src/lib/`. They live
only in `tests/helpers/processing.ts`, to read Processing fixtures.

- Source: `docs/shared-concepts.md`, "Units"
- Test: `tests/lib/units.test.ts`; every Processing comparison reads fixtures at `MM_V`

## Frustum panel height: not the true slant height

When top and bottom perimeters differ, the panel height is a hypotenuse, not the vertical
rise. But Processing computes it as `√(h² + (bottom side − top side)²)`, while the true slant
height of a frustum face is `√(h² + (bottom apothem − top apothem)²)`, with
`apothem = side / (2·tan(π/n))`. They agree only for prisms. The net still closes (any set of
equal trapezoids folds into *some* frustum), but not to the entered height. Examples:

| Shape (fixture) | Entered height | Folds to |
|---|---|---|
| `triangle_frustum` (Ø70 → Ø40) | 50 mm | 55.85 mm |
| `square_frustum` (45 → 25) | 50 mm | 52.92 mm |
| `hexagon_frustum_inverted` (Ø40 → Ø60) | 40 mm | 40.31 mm |

Processing's 3D view draws the entered height, and ScaffoldShell's frame is built to the
entered height (`Frame.pde`, `d.height = s.cylinder.z`), so for frustums the frame and the
folded shell disagree. ScaffoldShell's net code is identical to PaperPolyhedra's.

**Decision (Hannah, 2026-09-25): the web net matches Processing exactly**, including this.
The web app reports the height the net really folds to (`ShapeDims.foldedHeight`), and its
3D preview shows that height.

- Source: `Param.pde`, `setParams()` ("height fix" lines); same in `ScaffoldShell/Param.pde`
- Test: `tests/tools/paperpolyhedra/geometry.test.ts` (formula and folded height),
  `processing-match.test.ts` (fails for the three frustums if the true slant is used)

## PaperPolyhedra "diameter" inputs

The sidebar's TOP/BOTTOM DIAMETER is not one quantity. For 4 sides it is the **side length**
(perimeter = 4·d); for any other number of sides it is the **circumscribed diameter**
(perimeter = n·d·sin(π/n)). JSON import (`json_import.pde`) uses the same rule. Internally
everything runs on perimeters (`cylinder.x` top, `cylinder.y` bottom).

- Source: `UI.pde`, `applyToModel()`
- Test: `tests/tools/paperpolyhedra/geometry.test.ts`

## Hook tab offset uses the print scale in the cut file

`drawTzTopFolds` passes `hookOffset * MM` (72 DPI) to the hook tab even while the cut file is
drawn at `MM_V` (96 DPI). With `hookOffset = −1` mm, the hook's barb is −1 mm on the print but
−0.75 mm in the cut file. The web version uses −0.75 mm (what is actually cut) for both.

- Source: `tools.pde`, `drawTzTopFolds()`
- Test: `processing-match.test.ts` (all eight fixtures fail with −1 mm)

## Lids can fall outside the cutting area

Lids are placed below the strip at `max(1.25 × strip height, strip height + tab + extra + 2)`
and side by side, with no check against the 280 × 200 mm cutting area. All three frustum
fixtures put part of a lid or the strip outside it, so the cutter would not cut those lines.
The web app keeps the same layout and warns.

- Source: `PaperPolyhedra.pde`, `drawPlan()`
- Test: `tests/tools/paperpolyhedra/geometry.test.ts`, `fitsCutArea` in `src/lib/export.ts`

## Tab and flap clamping

`setParams()` limits tab depth to half the shorter side and half the panel height, flap depth
to half the shorter side, and flap taper to 0.33 × panel height. Strip tabs have a neck of
0.8 × tab depth, lid tabs and the hook 0.2 ×. Tabs cover one half of each edge: the right half
on the bottom edge and lids, the left half on the top edge.

- Source: `Param.pde`, `setParams()`; `api.pde`
- Test: `tests/tools/paperpolyhedra/geometry.test.ts`

## Variable polygons: circumradius by binary search

For per-edge widths `s[i]`, R is found by binary search so that `Σ 2·arcsin(s[i]/(2R)) = 2π`.
Non-convergence means the edges are not physically realisable.

- Source: `docs/shared-concepts.md`, "Variable polygons"
- Test: none yet; per-edge shapes are outside the basic web version

## FrustumSupport

### Numbers in the .scad are Java float strings

The export writes every parameter with Java's `"" + float`. Values are 32-bit floats, and
Java 17's `Float.toString` is not always the shortest decimal: it sometimes prints an extra
digit (`6.8129908E11`) or breaks a tie the other way (`53.6953125` → `53.695312`). OpenSCAD
reads these as doubles, so the exact digits matter. `src/lib/java-format.ts` ports Java 17's
`FloatingDecimal.dtoa`.

- Test: `tests/lib/java-format.test.ts` (5000 values printed by Processing's Java 17.0.8)

### Line endings follow the operating system

`PrintWriter.println` uses the system line separator, so a `.scad` exported on Windows has
CRLF and on macOS LF. OpenSCAD accepts both. The web app writes LF.

- Test: `tests/tools/frustumsupport/scad.test.ts` (also checks the CRLF form byte for byte)

### The rig comment can go stale

`// Rig 1 (M5Atom)` comes from the template last picked in the dropdown; editing the width,
depth or height afterwards does not reset it, so the comment can name a template the rig no
longer matches. The web app names the rig after the template its size matches, or `Custom`,
like Processing's dropdown label. Only the comment differs; the geometry is the same.

- Source: `FrustumSupport.pde`, `applyTemplate()`, `readControllers()`, `updateTemplateLabel()`
- Test: `tests/tools/frustumsupport/scad.test.ts` (`templateFor`)

### Frame radii are insets, the height is the full height

The frame modules draw strut centrelines at `radius − edge_radius` and between
`±(height − 2·edge_radius)/2`, so the entered radii and height are the frame's outside size.
Rig boxes sit at `offset_z − 2·edge_radius` above the bottom strut line.

- Source: `data/template_full.txt`, `template_simple.txt`
- Test: `tests/tools/frustumsupport/frame.test.ts`

## PaperPhicons

PaperPhicons predates the shared conventions. The web version keeps its block net, dash
pattern, colours and markers, and follows the shared print-and-cut layout (decided with
Hannah, 2026-09-25). Fixtures: `tests/fixtures/paperphicons/`.

### Its own print-and-cut layout

Both cut SVGs are translated by (5, 5) mm relative to the print (`offW_V_F`, `offH_V_F`), get
four corner "anchor" points, carry no physical units (`width="1058" height="755"`: correct only
if the cutter software assumes 96 DPI), and are named `result_`, `res_f_`, `calib_f_` plus the
stamp. Its crosses are 10 mm across in both files. The web version uses the shared layout
instead: no shift, shared crosses, mm units, `<name>_<stamp>` names.

- Source: `PaperPhicons.pde`, `draw()`; `ScanNCut.pde`
- Test: `tests/tools/paperphicons/processing-match.test.ts` (compares after removing the shift)

### Cut-file copies at 75 % spacing

The spacing between copies (`bboxW`, `bbowH`) is computed at print scale (`MM`) and reused
unchanged for the cut file, which is drawn at `MM_V`. With several copies, the cut copies land
at 75 % of the printed spacing and overlap: the cut file does not match its print. The web
version uses the printed spacing in both files.

- Source: `PaperPhicons.pde`, `draw()`
- Test: `processing-match.test.ts`, "places the cut copies at 75 % of the printed spacing"

### Lid fold inset 0.375 mm in the first cut copy

The lid's fold lines are inset by the paper thickness `thickMM`, but `drawPatternA_FrontFold`
runs before `drawPatternA_FrontCut` sets `thickMM` for the cut scale, so the first copy in the
cut file uses the print value, 0.5 × 72/96 = 0.375 mm, while its cut lines use 0.5 mm. Later
copies get 0.5 mm. The web version uses 0.5 mm throughout.

- Source: `Tools.pde`
- Test: `processing-match.test.ts` (the cut SVG matches exactly only with this reproduced)

### Markers snapped to whole points

`drawMarker` truncates the marker size to whole print pixels (`(int)mkr_size`, so 16 mm prints
as 45 pt = 15.9 mm) and draws each cell as `rect(round(i·g), round(j·g), ceil(g), ceil(g))`,
so cell edges move by up to 0.35 mm. The web version draws exact cells at the exact size,
which is what pose estimation assumes. Marker patterns and positions match Processing's.

- Source: `Tools.pde`, `drawMarker()`
- Test: `processing-match.test.ts` (pattern and position of every marker in the prints)

### The dictionary is ArUco original

`aruco1024_px.png` is OpenCV's `DICT_ARUCO_ORIGINAL` (5 × 5 bits, 1024 ids); `4x4_1000_px.png`
is not used. Each row of a marker is one of four 5-bit words carrying 2 bits of the id.
The UI allows ids up to 999 only; the web version allows 0–1023.

- Test: `tests/tools/paperphicons/aruco.test.ts` (all 1024 markers against the PNG)

### Fold dashes are 3 mm / 3 mm

Unlike PaperPolyhedra (1.2 mm), PaperPhicons draws folds with `dash = gap = 3` mm, and prints
front folds and cuts red, back (diagonal) folds blue. Kept as is.

### The copy spacing lags one frame

`bboxW` is computed at the top of `draw()` from the previous frame's sizes. Harmless when
using the UI; the fixture harness waits a few frames before exporting.

## DataPhysicalisation → PaperPolyhedra

Fixtures: `tests/fixtures/dataphysicalisation/` (Processing exports of `animals.csv`) and
`tests/fixtures/dataphysicalisation-examples/` (the files in `DataPhysicalisation/examples/`).

### Bar exports are not read by PaperPolyhedra

Bar mode exports `width` and `depth`, but PaperPolyhedra's `buildShapeFromJSON` only reads
`sides`, `diameter`, `height`, `label`, `marker_id` and `color`. Every bar therefore imports as
the default: 4 sides, 30 mm. All files in `examples/`, including the "canonical"
`polyhedra_export.json`, are bar exports. **Decision (Hannah, 2026-09-25):** the web export
also writes `sides: 4` and `diameter` = width for bars, so both PaperPolyhedra versions build
them at the previewed size. `width`/`depth` stay for compatibility. Bars whose width and depth
differ are flagged: PaperPolyhedra makes them square, using the width.

- Test: `tests/tools/dataphysicalisation/handoff.test.ts`

### Four-sided shapes: diameter means two things

DataPhysicalisation previews every prism with `diameter` as the corner-to-corner size, but
PaperPolyhedra reads a 4-sided `diameter` as the side length, so the paper square came out √2
(41 %) larger than previewed. **Decision (Hannah, 2026-09-25):** the web export writes the side
length (diameter / √2) for 4-sided polyhedra. Other side counts are unchanged.

- Test: `handoff.test.ts` ("import with the previewed corner-to-corner size, 4 sides included")

### Separate width and depth cannot be reached in Processing

`barLinked = false` (width and depth from two columns) is implemented, but the button that
toggles it is hidden ("kept for future use") and there are no selectors for the width/depth
columns: they are set automatically to the 2nd and 3rd number columns. The web app offers the
mode with column selectors.

### Scaling and colours

Values are normalised over **all** rows, even when *shapes to show* uses only the first ones.
Sides are `(int) map(norm, 0, 1, 3, maxSides)`, truncated, so only the largest value reaches
the maximum. Colours are Processing's own arithmetic in 32-bit floats: `lerpColor` from
(50, 80, 255) to (255, 60, 50) for numbers, HSB hue `map(i, 0, categories, 0, 300)` at 80 %
saturation and 90 % brightness for categories (truncated, not rounded, to 0–255), and hue bands
at 85 % saturation for thresholds. Cells that are not numbers become NaN (Processing's
`float()`); the web app refuses to export shapes without a height.

- Test: `tests/tools/dataphysicalisation/processing-match.test.ts` (sizes within 0.001 mm,
  colours exact, five cases)
