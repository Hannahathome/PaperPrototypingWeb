---
title: Make your first shape
description: Design a hexagonal prism in the PaperPolyhedra web app, print it, cut it and fold it.
---

## Goal

A folded paper hexagonal prism, 50 mm tall, made with the PaperPolyhedra web app. Along the
way you learn what each setting does and how to read the warnings.

## What you need

- The [PaperPolyhedra web app](../../../apps/paperpolyhedra/)
- A printer, A4 paper (about 160 g/m² folds well) and a vinyl cutter
- A printer and cutter you have checked with the
  [calibration test sheet](../../../apps/calibration/)
- Glue or double-sided tape for the glue flap (optional; the hook tab also holds)

## Steps

1. **Open the app.** It starts with a hexagon: 6 sides, diameter 50 mm, height 50 mm. The
   sheet preview shows the net on an A4 page; the 3D view shows the folded shape. Drag it to
   look around.
2. **Set the size.** *Top diameter* is the diameter of the circle through the corners (for 4
   sides it is the side length instead). The facts above the preview show the perimeter and
   side length this gives. Leave *Bottom same as top* ticked for a prism; untick it to make a
   frustum (a shape that is wider at one end).
3. **Check the notes.** An orange note appears when something needs your attention:
   - part of the net lies outside the 280 × 200 mm cutting area (make the shape smaller);
   - a frustum folds to a slightly different height than you entered (this is how the
     Processing version builds frustums; the app tells you the real height);
   - a tab or flap was made smaller to fit the panels.
4. **Add colour or images (optional).** Tick *Fill colour*, or choose *Side images* and pick
   an image. Tick *Turn side images upside down* if your image should read upright on the
   folded shape. Lid images are printed only when you also use side images.
5. **Download.** Give the file a name and click *Download PDF + cut files*. You get three
   files: the PDF for the printer, the `_fold_` SVG for the cutter, and the `_calib_` SVG with
   registration marks.
6. **Print and cut.** Print the PDF at *Actual size*. Cut the `_calib_` file first and check
   the crosses line up, then cut the `_fold_` file. See
   [Print and cut at actual size](../print-and-cut-at-actual-size/) for the details.
7. **Fold.** Fold along all the dashed lines, printed side out. Close the strip: the hook tab
   on the last panel goes through the slit beside the glue flap on the first panel. Then fold
   the lids on, tucking all tabs inside the shape.

## Common problems

**The note says the net lies outside the cutting area.**
Make the shape smaller, or lower, or use fewer sides. Frustums take more room because the
strip curves.

**The frustum is taller than I entered.**
That is expected: the app shows the height it really folds to. The nets are identical to the
Processing version's, which builds frustum panels this way.

**My image is upside down on the folded shape.**
Tick *Turn side images upside down* and download again.

**The lids don't close neatly.**
Check that the fold lines were scored, not cut through, and that the print was at actual
size; a scaled print makes the lids a different size from the strip.

## Last checked

2026-09-25, PaperPolyhedra web app (first version). Not yet checked with a physical print
and cut.
