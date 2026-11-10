# To review (Hannah)

Places where the web versions deliberately reproduce the Processing tools although the result
may not be what you want. Each item says what happens, how big it is, and what fixing it would
mean. Details and tests are in [hidden-behaviour.md](hidden-behaviour.md).

## 1. Frustum panel height (PaperPolyhedra, ScaffoldShell)

The net's panel height is `√(h² + (bottom side − top side)²)` instead of the true slant height
`√(h² + (bottom apothem − top apothem)²)`, so frustums fold to a different height than entered
(prisms are exact). Decided 2026-09-25: keep it, identical to Processing. The apps show the
real folded height.

| Frustum | Entered | Folds to |
|---|---|---|
| square 45 → 25 | 50 | 52.92 |
| triangle Ø70 → Ø40 | 50 | 55.85 |
| hexagon Ø40 → Ø60 | 40 | 40.31 |

Fixing it: one line in `shapeDims()` (`src/tools/paperpolyhedra/core/params.ts`), plus the same
in Processing's `Param.pde` (both sketches). The Oblique Boxes sketch in TEI27Software already
uses the true slant height.

## 2. Scaffold height versus the folded shell (ScaffoldShell)

The scaffold is built to the **entered** height, as ScaffoldShell does, but the shell folds to
the height in item 1. Decided 2026-09-26: follow Processing for now, list here for review.
Room between the frame's top corners and the paper (clearance 0.4 mm and strut radius 1 mm
included):

| Frustum | Shell folds to | Frame top at | Room at the top corners |
|---|---|---|---|
| square 45 → 25 (narrowing) | 52.92 | 49.60 | +1.29 mm |
| triangle Ø70 → Ø40 (narrowing) | 55.85 | 49.60 | +2.08 mm |
| hexagon Ø40 → Ø60 (widening) | 40.31 | 39.60 | +0.22 mm |
| square 25 → 45 (widening) | 52.92 | 49.60 | **−0.49 mm** |
| triangle Ø40 → Ø70 (widening) | 55.85 | 49.60 | **−1.28 mm** |

- Narrowing frustums: the frame is shorter than the shell, so it is loose at the top, and a
  rig that "reaches" the top lid (window planning uses the entered height) actually stops
  3–6 mm below it.
- **Widening frustums: the frame's top corners are outside the paper** (negative room), so the
  frame presses into the shell or does not fit.
- Prisms are exact.

Fixing it: build the frame to the folded height (`frameDims()` in
`src/tools/scaffoldshell/core/frame.ts` and `frameDimsFor()` in `ScaffoldShell/Frame.pde`), or fix
item 1, which removes the difference altogether. The app shows a note on every frustum
scaffold until then.

## 3. Hook tab offset (PaperPolyhedra, ScaffoldShell)

The hook tab's barb is −1 mm on the print but −0.75 mm in the cut file (a print-scale value
used at cut scale). The web versions use −0.75 mm, what is actually cut. Is −0.75 or −1 mm
what the hook should be?

## 4. PaperPhicons cut files (fixed in the web version)

Processing PaperPhicons places cut copies at 75 % of the printed spacing when printing more
than one block, and insets the first copy's lid folds by 0.375 mm instead of 0.5 mm. The web
version fixes both. Worth fixing in the Processing sketch too if it is still used.

## 5. DataPhysicalisation → PaperPolyhedra (fixed in the web version)

Processing PaperPolyhedra ignores bar exports' width, so bars import as 30 mm squares, and
reads a 4-sided diameter as a side length (41 % larger than previewed). The web export writes
`sides`/`diameter` for bars and side lengths for 4 sides. Processing's importer or exporter
could get the same fix.

## 6. PaperPolyhedra's first shape touches a calibration cross

The first shape starts at Processing's pattern origin, (10, 20) mm. The top-left calibration
cross reaches 10 mm around (10, 10), so its vertical arm ends at (10, 20), on the net's top
edge, and the app shows "Shape 1 reaches a corner where a calibration cross is cut" as soon as
it opens. Your physical check passed with this layout. Fixing it: start the first shape in a
free spot (22 mm from the corner), as added shapes already do. Processing has the same layout.
