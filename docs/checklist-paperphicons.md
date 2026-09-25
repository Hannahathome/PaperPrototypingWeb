# Physical checklist: PaperPhicons

Run this before switching PaperPhicons to `available` in `src/data/tools.json`, and after any
change to `src/tools/paperphicons/core/`. Do the [calibration checklist](checklist-calibration.md)
first on the same printer and cutter.

App: `/apps/paperphicons/`. Print at **Actual size**; cut the `_calib_` file first.

## Blocks

### 1. Default block: 50 × 50 × 20, marker 48, size 16, one copy

- [ ] Marker's black square measures 16.0 mm (±0.2) on the print
- [ ] Cut lines land on the printed outline; folds are scored, not cut through
- [ ] Block folds closed; lid flaps tuck in; the glue flap reaches
- [ ] Folded block measures 50 × 50 × 20 mm (±1)

### 2. Three copies: 30 × 30 × 30, first marker 100, size 12

- [ ] All three blocks are cut where they are printed (this was wrong in the Processing cut file)
- [ ] Ids 100, 101, 102 are printed above the markers

### 3. Marker on the side: 30 × 60 × 25, marker 7, size 20, on the side wall

- [ ] The app warns that the marker and margin (25.7 mm) are larger than the 25 mm face
- [ ] With size 16 instead, no warning, and the marker sits in the middle of the side wall

## Camera

- [ ] OpenCV (or your tracking software) with `DICT_ARUCO_ORIGINAL` detects every block
- [ ] The detected ids equal the ids printed above the markers (48; 100, 101, 102; 7)
- [ ] Detection works from the distance you need

## Results

| Date | Blocks | Printer | Cutter / software | Camera / software | Result | By |
|---|---|---|---|---|---|---|
| | | | | | | |
