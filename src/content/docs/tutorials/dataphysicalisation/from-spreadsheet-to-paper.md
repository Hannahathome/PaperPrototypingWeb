---
title: From spreadsheet to paper shapes
description: Turn a CSV file into a set of paper shapes, one per row, and cut them on one sheet.
---

## Goal

A set of folded paper shapes, one per row of your data, whose height, width and colour show
the values in your spreadsheet.

## What you need

- A spreadsheet saved as **CSV** (in Excel or Google Sheets: *File → Save as / Download → CSV*),
  with column names in the first row
- The [DataPhysicalisation web app](../../../apps/dataphysicalisation/) and the
  [PaperPolyhedra web app](../../../apps/paperpolyhedra/)
- A printer, paper and a vinyl cutter, checked with the
  [calibration test sheet](../../../apps/calibration/)

## Steps

1. **Load the data.** Open DataPhysicalisation and choose your CSV file, or click *Try the
   example data* first to see how it works. Your file stays on your computer.
2. **Choose the shape.** *Bars* are boxes; *Polyhedra* are prisms whose number of sides can
   also come from your data.
3. **Map the columns.** Pick which column gives the label, the height, the width (or
   diameter), the sides and the colour. For colour, a number column gives a blue-to-red scale
   (or bands, if you type thresholds such as `10, 50`); a text column gives one colour per
   category.
4. **Set the sizes.** *Maximum height* and *Maximum width* are the largest shape in mm. With
   *Relative* scaling, the smallest value gets the minimum percentage you set; with *True
   size*, sizes are proportional to the values from zero, which keeps ratios honest but can make
   small values very thin.
5. **Check.** Look at the 3D view (or the 2D chart for bars) and the table. Very small shapes
   are hard to fold; PaperPolyhedra tells you when it had to make a shape's tabs smaller.
6. **Send to PaperPolyhedra.** Click *Open in PaperPolyhedra*. The shapes appear in the list
   and are arranged on the sheet; shapes that do not fit are left unticked.
7. **Place the shapes.** Drag them on the sheet preview, or click *Arrange*. Untick shapes to
   leave them for a second sheet. Fix any orange notes (overlaps, shapes outside the cutting
   area or in a corner).
8. **Download, print, cut and fold** as in [Make your first shape](../../paperpolyhedra/make-your-first-shape/).
   For more shapes, untick the ones you have done, tick the next ones and export again.

## Common problems

**All shapes are the same size.**
Check that the height (and width) columns hold numbers. Cells with text or empty cells cannot
be used; the app warns about them.

**The shapes are too small to fold.**
Raise *Maximum width* or the minimum percentage, or switch from *True size* to *Relative*.

**PaperPolyhedra makes my bars square.**
PaperPolyhedra makes prisms with equal sides. Bars with a different width and depth come out
square, using the width; the app warns about this.

**The button does not open PaperPolyhedra with my shapes.**
Some browsers block this. Use *Download JSON* and load the file in PaperPolyhedra with
*Import shapes (JSON)*.

## Last checked

2026-09-25, DataPhysicalisation and PaperPolyhedra web apps (first versions). Not yet checked
with printed shapes.
