---
title: Make a block with a knob hole
description: Cut a round hole in a trackable paper block so a knob can reach through it.
---

## Goal

A folded paper block with a round hole in its top for a knob, and an ArUco marker on its side,
so a camera can follow the block while someone turns the knob.

## What you need

- The [Phicon Widgets web app](../../../apps/phiconwidgets/)
- A printer, A4 paper (about 160 g/m²) and a vinyl cutter, checked with the
  [calibration test sheet](../../../apps/calibration/)
- The knob (or button or slider) you want to fit, and a ruler or calliper

## Steps

1. **Measure your knob.** Measure the part that goes through the paper and add some play,
   for example 1 mm, so it turns freely.
2. **Set the block.** Width and length make the base face, where the holes go; height is the
   depth of the block. It must be deep enough for what sits inside.
3. **Place the marker.** The app opens with the marker on the *Side wall*, clear of the holes.
   To keep it on the base instead, choose *Base* and move it with *Marker offset* until it no
   longer overlaps a hole.
4. **Set the hole.** The app opens with one 20 mm circle in the middle of the base face.
   Change its diameter to your knob's size. *Right of centre* and *Below centre* move it.
5. **Add more holes** if you need them: *Add cut-out* copies the selected hole and moves it
   aside. Choose *Pill* for a slider slot (tick *Vertical* to run it along the length) or
   *Square or rectangle* for a button.
6. **Check the notes.** An orange note appears when a hole cuts into the marker or its white
   margin, or reaches past the face into the folds. Fix these before printing.
7. **Download, print and cut** as in [Make trackable blocks](../../paperphicons/make-trackable-blocks/):
   print at actual size, then cut the `_calib_` file, then the `_fold_` file.
8. **Fold the block** with the holed face on top and fit the knob.

## Common problems

**The knob is too tight or too loose.**
Change the hole size by the difference and print again. Paper edges also soften with use, so
start slightly tight.

**The camera no longer finds the marker.**
Keep holes, and the knob, clear of the marker and its white margin; hands turning the knob
should not cover the marker either. The side wall is often the best place for the marker.

**Every block on the sheet has the same holes.**
That is how the app works. For blocks with different holes, make separate sheets.

## Last checked

2026-09-27, Phicon Widgets web app (first version). Not yet checked with a printed block.
