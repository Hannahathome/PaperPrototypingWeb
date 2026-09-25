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
