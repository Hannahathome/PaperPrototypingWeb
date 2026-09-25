---
title: Make trackable blocks
description: Print and fold paper blocks with ArUco markers, and check that a camera recognises them.
---

## Goal

A set of folded paper blocks, each with its own ArUco marker, that a camera can recognise
and track, for example in a study or a tangible interface.

## What you need

- The [PaperPhicons web app](../../../apps/paperphicons/)
- A printer, A4 paper (about 160 g/m²) and a vinyl cutter, checked with the
  [calibration test sheet](../../../apps/calibration/)
- A camera and tracking software that reads ArUco markers (for example OpenCV with the
  `DICT_ARUCO_ORIGINAL` dictionary)

## Steps

1. **Set the block size.** Width and length make the face that carries the marker; height is
   the depth of the block.
2. **Choose the markers.** *First marker id* is the id of the first block; every next copy
   gets the next id. Write down which ids you use so your software knows them.
3. **Set the marker size.** The size is the black square. The app adds a white margin of one
   cell around it; the note warns if marker and margin do not fit the face. Bigger markers are
   detected from further away.
4. **Choose the face.** *Base* puts the marker on the large face; *Side wall* on the narrow
   face along the length.
5. **Set the number of copies.** The sheet preview shows how many fit; an orange note appears
   when something falls outside the cutting area.
6. **Download, print and cut.** Print the PDF at *Actual size*, cut the `_calib_` file first,
   then the `_fold_` file.
7. **Fold.** Fold on the dashed lines. On the print, red and blue dashes are different kinds
   of fold (the Processing version calls them front and back folds); the blue ones are the
   diagonal folds in the corners.
8. **Test with the camera.** Hold each block in front of the camera and check that your
   software reports the right id.

## Common problems

**The camera does not detect the marker.**
Check that the software uses the ArUco original dictionary, that the white margin around the
marker is clean, and that the print was at actual size. Make the marker bigger if the camera
is far away.

**The camera reports the wrong id.**
The software is probably set to a different dictionary (for example 4 × 4 or 5 × 5 with 1000
markers). Switch to ArUco original.

**The id number printed above the marker gets in the way.**
It sits on the white margin, as in the Processing version. Detection usually copes; if not,
cover it with a small piece of white paper.

## Last checked

2026-09-25, PaperPhicons web app (first version). Not yet checked with printed blocks or a
camera.
