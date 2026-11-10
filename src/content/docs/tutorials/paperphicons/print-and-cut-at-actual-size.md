---
title: Print and cut at actual size
description: The print-and-cut routine that every PaperPhicons export follows.
---

## Goal

Print a PaperPhicons net and cut it on a vinyl cutter so that the cut lines land exactly on
the printed artwork. The same routine works for every tool that exports a PDF plus two SVG files.

## What you need

- The [PaperPhicons Processing version](https://github.com/Hannahathome/PaperPrototyping/tree/main/PaperPolyhedra) and an exported net
- A printer and A4 paper
- A Brother ScanNCut with its pen attachment and cutting mat
- A ruler with millimetre markings

## Steps

1. **Find the three export files.** Every export produces three files with the same timestamp
   (month, day, hour, minutes, seconds):

   | File | Goes to | Contains |
   |---|---|---|
   | `<name>_<stamp>.pdf` | Printer | Artwork, fills, labels |
   | `<name>_fold_<stamp>.svg` | Cutter | Cut lines and fold lines |
   | `<name>_calib_<stamp>.svg` | Cutter (pen) | Calibration crosses |

2. **Print the PDF at actual size.** In the print dialog choose *Actual size* (or *100 %*).
   Never use *Fit to page*: it shrinks the print and the cuts will no longer line up.
3. **Check the print with a ruler.** Measure one edge whose length you know. It should match
   to within half a millimetre.
4. **Calibrate.** Place the printed sheet on the mat and draw the `_calib_` SVG with the pen
   attachment.
5. **Cut the fold file**. Fold lines are dashed so the cutter scores them
   instead of cutting through.

## Common problems

**The cuts are about a third too large or too small.**
The cutter is interpreting the file at a different DPI than it was exported at. Check the
cutter software's import scale before changing anything in the tool.

**The cuts are shifted but the right size.**
Calibrate again with the `_calib_` file.

**Fold lines are cut all the way through.**
Check the dash-pattern or scoring setting in the cutter software.

## Last checked

2026-09-25, written from the PaperPrototyping documentation (`docs/shared-concepts.md`,
main branch). Not yet re-checked on a physical cutter.
