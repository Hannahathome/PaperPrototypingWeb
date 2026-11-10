# Physical checklist: FrustumSupport

Run this before switching FrustumSupport to `available` in `src/data/tools.json`, and after
any change to `src/tools/frustumsupport/core/` or its OpenSCAD templates.

App: `/apps/frustumsupport/`.

## Same as Processing

- [ ] Export the default frame from the web app and from the Processing version with the same
      values; open both in OpenSCAD: the models are identical (the files differ only in line
      endings).

## Print

Use the hourglass settings: 6 sides, bottom radius 20, top radius 30, height 40, edge
radius 1, one M5Atom rig at offset (0, 0, 8.5), single posts.

- [ ] Renders in OpenSCAD (F6) without errors and exports an STL
- [ ] Printed frame: bottom corner-to-centre 20 mm (±0.5), top 30 mm (±0.5), height 40 mm (±0.5)
- [ ] Wall struts are cut off flat at the top
- [ ] An M5Atom fits between the four posts
- [ ] The frame slides into a matching paper shell

## Results

| Date | Frame | Printer | Material | Result | By |
|---|---|---|---|---|---|
| | | | | | |
