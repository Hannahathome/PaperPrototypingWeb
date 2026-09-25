---
title: Print and cut at actual size
description: The print-and-cut routine that every PaperPolyhedra export follows, and how to check your setup before a long run.
---

## Goal

Print a PaperPolyhedra net and cut it on a vinyl cutter so that the cut lines land exactly on
the printed artwork. The same routine works for every tool that exports a PDF plus two SVG files.

## What you need

- The [PaperPolyhedra Processing version](https://github.com/Hannahathome/PaperPrototyping/tree/main/PaperPolyhedra) and an exported net
- A printer and A4 paper
- A vinyl cutter with its cutting mat
- A ruler with millimetre markings

## Steps

1. **Find the three export files.** Every export produces three files with the same timestamp
   (month, day, hour, minutes, seconds):

   | File | Goes to | Contains |
   |---|---|---|
   | `<name>_<stamp>.pdf` | Printer | Artwork, fills, labels |
   | `<name>_fold_<stamp>.svg` | Cutter | Cut lines and fold lines |
   | `<name>_calib_<stamp>.svg` | Cutter | Registration marks only |

2. **Print the PDF at actual size.** In the print dialog choose *Actual size* (or *100 %*).
   Never use *Fit to page*: it shrinks the print and the cuts will no longer line up.
3. **Check the print with a ruler.** Measure one edge whose length you know. It should match
   to within half a millimetre.
4. **Cut the calibration file first.** Place the printed sheet on the mat and cut the
   `_calib_` SVG. The marks should land on the printed registration marks. This is cheap, so
   do it before every long run.
5. **Cut the fold file** with the same origin. Fold lines are dashed so the cutter scores them
   instead of cutting through.

## Common problems

**The cuts are about a third too large or too small.**
The cutter is interpreting the file at a different DPI than it was exported at. Check the
cutter software's import scale before changing anything in the tool.

**The cuts are shifted but the right size.**
The origin on the cutter differs from the one used for the calibration cut. Re-align and cut
the calibration file again.

**Fold lines are cut all the way through.**
Check the dash-pattern or scoring setting in the cutter software.

## Last checked

2026-09-25, written from the PaperPrototyping documentation (`docs/shared-concepts.md`,
main branch). Not yet re-checked on a physical cutter.
