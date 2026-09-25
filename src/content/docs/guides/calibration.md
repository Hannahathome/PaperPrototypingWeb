---
title: Check your printer and cutter
description: Print and cut the calibration test sheet to make sure prints are actual size and cuts land on the print.
---

## Goal

Make sure your printer prints at exactly 100 % and your vinyl cutter cuts exactly where the
print is. Do this once for every new printer, cutter or cutter software setting, and again
whenever cut lines stop lining up.

## What you need

- The [calibration test sheet](../../apps/calibration/): download its three files
- A printer and A4 paper (the paper you'll use for your prototypes)
- A vinyl cutter with its cutting mat
- A ruler with millimetre markings, ideally steel

## Steps

1. **Download the files.** On the [calibration test sheet](../../apps/calibration/) page,
   click *Download the three files*. You get `calibration_<stamp>.pdf`,
   `calibration_fold_<stamp>.svg` and `calibration_calib_<stamp>.svg`. Your browser may ask
   once whether the site may download several files; allow it.
2. **Print the PDF at actual size.** In the print dialog choose *Actual size* (or *100 %*,
   *Scale: 100*). Never *Fit to page* or *Shrink oversized pages*.
3. **Measure the print.** The long line must be 250 mm and the upright line 150 mm, both
   within 0.5 mm. If they are too short, the printer is still scaling: check the print
   dialog again before going on.
4. **Cut the calibration file.** Put the printed sheet on the mat, load the `_calib_` SVG in
   the cutter software and cut. Each of the four cut crosses must run through the small
   printed cross in the same corner.
5. **Cut the fold file.** Without moving the sheet, load the `_fold_` SVG and cut. Both
   rectangles should be cut inside their grey bands (the band is 1 mm wide, so the cut is
   within ±0.5 mm), and the fold line should be scored as dashes, not cut through.
6. **Check the cut pieces.** Measure the square (50 × 50 mm) and the rectangle
   (100 × 50 mm). Both should be within 0.5 mm.

## Common problems

**The printed lines are about 3 % too short.**
The print dialog scaled the page to fit the printer's margins. Choose *Actual size*.

**The cuts are about a third too large or too small.**
The cutter software is reading the SVG at the wrong resolution. The files declare their size
in millimetres (280 × 200 mm); make sure the software imports them at that size and does not
rescale them.

**The cuts are the right size but shifted.**
The cutter's origin differs from the print's top-left corner. Re-align the sheet on the mat
and cut the calibration file again until the crosses line up.

**The fold line is cut all the way through.**
Lower the blade depth or pressure for fold lines, or check the dash or scoring setting.

## Last checked

2026-09-25, calibration test sheet web app (first version). Not yet checked on a physical
printer and cutter.
