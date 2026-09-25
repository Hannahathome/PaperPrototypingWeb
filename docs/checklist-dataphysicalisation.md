# Physical checklist: DataPhysicalisation (and PaperPolyhedra's multi-shape sheet)

Run this before switching DataPhysicalisation to `available` in `src/data/tools.json`, and
after any change to `src/tools/dataphysicalisation/core/`, PaperPolyhedra's import, or its
sheet layout. Do the [calibration checklist](checklist-calibration.md) first.

## Same as Processing

- [ ] Load the same CSV in the Processing version and the web app, with the same columns and
      settings; the table's heights and widths match Processing's export, and the colours look
      the same.

## Handoff

Use the example data (*Try the example data*), Bars, height = `speed_kmh`, width =
`lifespan_years`, maximum height 60, maximum width 30.

- [ ] *Open in PaperPolyhedra* shows all 8 shapes with their labels and colours
- [ ] Shapes that fit are on the sheet, clear of the corner crosses; any that do not are
      unticked
- [ ] Download JSON, then *Import shapes (JSON)* in PaperPolyhedra gives the same shapes

## Print one sheet

- [ ] Drag two shapes next to each other; no overlap warning; export
- [ ] The cut lines of every shape land on its print (all shapes on the sheet, not just one)
- [ ] One bar's printed width equals the table's width (±0.5 mm), and its height the table's
      height (±0.5 mm); it folds closed
- [ ] With Polyhedra and a 4-sided shape: the folded square's corner-to-corner size equals
      the diameter in the table

## Results

| Date | Data / settings | Printer | Cutter / software | Result | By |
|---|---|---|---|---|---|
| | | | | | |
