---
title: Build a shell with a scaffold
description: Make a paper box with a 3D-printed frame inside that holds an M5Atom, with a window in the lid.
---

## Goal

A folded paper shell with a 3D-printed scaffold inside it that holds an M5Atom, and a window
cut in the top lid so the M5Atom's screen shows through.

## What you need

- The [ScaffoldShell web app](../../../apps/scaffoldshell/)
- A printer, paper and a vinyl cutter, checked with the
  [calibration test sheet](../../../apps/calibration/)
- [OpenSCAD](https://openscad.org/) and a 3D printer for the scaffold
- An M5Atom (or your own component and its size)

## Steps

1. **Design the shell.** Start with a prism (top and bottom the same), for example 4 sides,
   diameter 45 mm, height 60 mm. Prisms give the most exact fit; see *Common problems* for
   frustums.
2. **Turn on the scaffold.** In the *Scaffold* panel tick *Build a scaffold for this shape*.
   The line under it shows the frame's number of sides, radii and height, read from the shell.
3. **Set the clearance.** This is the gap between the frame and the paper. Start with the
   default (0.4 mm) for a first test, then measure a folded shell and adjust it (see below).
4. **Add a rig.** Click *Add rig* and choose *M5Atom* as the component. *Offset Z* lifts it from
   the floor; *Offset X/Y* moves it sideways; *Rotation* turns it. Watch the 3D view.
5. **Cut a window.** Set *Window in the paper* to *Top*. Raise *Offset Z* until the status says
   the rig *cuts* a square into the top lid (its top must come within about 2 mm of the lid).
   For the 60 mm box, *Offset Z* 27.5 works. The window appears in the lid on the sheet.
6. **Download.** Click *Download PDF + cut files*. You get the PDF, the two SVG files for the
   cutter and a `.scad` file for the scaffold.
7. **Print and cut the shell**, as in [Make your first shape](../../paperpolyhedra/make-your-first-shape/).
8. **Print the scaffold.** Open the `.scad` in OpenSCAD, render (F6), export STL and print it.
9. **Assemble.** Put the M5Atom on its rig, put the scaffold in the shell and close the shell.

## Common problems

**The scaffold is too tight or too loose in the shell.**
Measure the folded shell against the size the app shows and change the clearance by the
difference. Paper thickness and how tightly you fold both matter, which is why the app cannot
work this out.

**My frustum's scaffold does not fit.**
The scaffold is built to the height you entered, but frustums fold to a slightly different
height (the app says how much). Scaffolds for frustums that get wider towards the top can end
up slightly too wide at the top. This is known and listed for review; use a prism, or check
the fit carefully.

**The window does not appear.**
The rig's face must come within the strut radius + 1 mm of the paper. The status under the
window setting says how far it is.

**The window crosses a fold line.**
It is still cut, but the fold will be weak. Move the rig, or choose the 16 mm window.

## Last checked

2026-09-26, ScaffoldShell web app (first version). Not yet checked with a printed scaffold.
