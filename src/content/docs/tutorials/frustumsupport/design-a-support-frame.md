---
title: Design a support frame
description: Make a 3D-printable frame with a mount for an M5Atom, sized to fit inside a paper frustum.
---

## Goal

A 3D-printed strut frame that sits inside a folded paper frustum and holds an M5Atom. You
design it in the FrustumSupport web app, render it in OpenSCAD and print it.

## What you need

- The [FrustumSupport web app](../../../apps/frustumsupport/)
- [OpenSCAD](https://openscad.org/) (free) to turn the downloaded file into an STL
- A 3D printer and its slicer software
- The paper shell the frame goes into, or its sizes

## Steps

1. **Measure the shell as radii.** FrustumSupport needs the distance from the centre to a
   corner (the circumradius) at the bottom and the top, and the height. If you made the shell
   in PaperPolyhedra: for 3, 5, 6 or more sides the radius is half the "diameter"; for 4 sides
   it is the side length divided by 1.414.
2. **Set the frustum.** Enter the number of sides, bottom radius, top radius and height. *Edge
   radius* is the thickness of the struts divided by 2; 1 mm gives 2 mm struts.
3. **Add a rig.** With *Internal rigs* ticked, pick *M5Atom* as the electronics template. Move
   the rig with *Offset X/Y/Z* and turn it with *Rotation*. Use **+** to add another rig (it
   starts as a copy of the selected one) and **−** to remove one.
4. **Check the preview.** Drag to look around. The rig's box must fit inside the frame, and
   the green posts must not stick out through the wall struts.
5. **Download.** Click *Download OpenSCAD file*.
6. **Render and export.** Open the file in OpenSCAD, press F6 to render, then
   *File → Export → Export as STL*.
7. **Print** the STL and put the frame into the shell before you close the shell's last lid.

## Common problems

**The frame does not fit into the shell.**
Check that you entered radii, not diameters or perimeters. The entered radii are the frame's
outside size, so make them a little smaller than the shell's to leave room for the paper
(PaperPolyhedra assumes paper 0.25 mm thick).

**The frame is shorter or taller than a PaperPolyhedra frustum.**
PaperPolyhedra frustums fold to a slightly different height than the one you typed; the
PaperPolyhedra app shows the real folded height. Use that height here.

**The wall struts are in the middle of the paper's sides instead of in the corners.**
The frame's first corner points along the x axis, while PaperPolyhedra's shells are turned
differently. Rotate the frame when you place it, or wait for ScaffoldShell, which lines the two
up automatically.

**OpenSCAD takes long to render.**
That is normal for frames with many rigs. The preview (F5) is quick; only the final render
(F6) is slow.

## Last checked

2026-09-25, FrustumSupport web app (first version). Not yet checked with a printed frame.
