# Physical checklist: calibration test sheet

Run this after any change to `src/lib/` (units, SVG, PDF or export code), and with every new
printer, cutter or cutter software. Record the result at the bottom.

Page: `/apps/calibration/`. User guide: `src/content/docs/guides/calibration.md`.

## Print

- [ ] Download the three files; names are `calibration_<M_D_H_MM_SS>.pdf`,
      `calibration_fold_<stamp>.svg`, `calibration_calib_<stamp>.svg`.
- [ ] Open the PDF: page size shows as 297 × 210 mm (A4 landscape).
- [ ] Print at **Actual size**.
- [ ] Horizontal line measures 250.0 mm (±0.5).
- [ ] Vertical line measures 150.0 mm (±0.5).
- [ ] Printed crosses sit 10 mm from the left and top edges of where the cutter's origin will be.

## Cut

- [ ] Cutter software imports both SVGs at 280 × 200 mm without rescaling.
- [ ] Calibration SVG: each cut cross runs through its printed cross (within 0.5 mm).
- [ ] Fold SVG: both rectangles are cut inside their grey bands (±0.5 mm).
- [ ] Fold line is scored as dashes, not cut through.
- [ ] Cut square measures 50.0 × 50.0 mm (±0.5).
- [ ] Cut rectangle measures 100.0 × 50.0 mm (±0.5).

## Results

| Date | Printer | Cutter / software | Paper | Result | By |
|---|---|---|---|---|---|
| | | | | | |
