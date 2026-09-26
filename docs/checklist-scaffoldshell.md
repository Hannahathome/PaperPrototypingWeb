# Physical checklist: ScaffoldShell

Run this before switching ScaffoldShell to `available` in `src/data/tools.json`, and after any
change to `src/tools/scaffoldshell/core/`. Do the [calibration checklist](checklist-calibration.md)
first. The shell net is PaperPolyhedra's, which has passed its own check.

App: `/apps/scaffoldshell/`.

## Same as Processing

- [ ] Export the square prism below from the web app and from Processing ScaffoldShell with the
      same settings: the `.scad` files are identical (apart from line endings) and render the
      same model in OpenSCAD.

## Prism with a top window

4 sides, diameter 45, height 60, tab 10; scaffold on, clearance 0.4, strut radius 1; one
M5Atom rig at Offset Z 27.5, window Top.

- [ ] The status says the rig cuts a 16 mm square into the top lid
- [ ] The `.scad` renders in OpenSCAD (F6) and exports an STL
- [ ] The printed scaffold slides into the folded shell: not loose, not forced
      (note the clearance that fits best: ______ mm)
- [ ] The wall struts sit in the shell's corners
- [ ] The M5Atom fits between its posts, and its screen shows through the window

## Wall window

8 sides, diameter 80, height 70; M5Core rig at Offset Y 27.5, Offset Z 6, window Front (+Y).

- [ ] The window is cut into the wall panel the rig faces, centred on it
- [ ] With the shell folded, the window lines up with the rig's front face

## Frustum (see review-for-hannah.md, item 2)

- [ ] Square frustum bottom 45, top 25, height 50: note how far the frame sits below the top lid
- [ ] Square frustum bottom 25, top 45 (widening), height 50: note whether the frame fits

## Results

| Date | Shape | Clearance | Printer / material | Result | By |
|---|---|---|---|---|---|
| | | | | | |
