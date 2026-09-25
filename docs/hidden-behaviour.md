# Hidden behaviour in the Processing tools

Non-obvious behaviour found in the Processing code that the web versions must reproduce (or
deliberately correct). Every entry gets a test once the code it concerns is ported; the
**Test** line points to it. Source: the PaperPrototyping repo, unless noted.

## Radius vs perimeter

PaperPolyhedra is driven by *perimeters and per-edge widths*; FrustumSupport by
*circumradii*. For a regular n-gon with circumradius R:

```
perimeter = 2 · n · R · sin(π/n)
R         = perimeter / (2 · n · sin(π/n))
```

A frame specified in the wrong quantity will not seat inside its shell.

- Source: `docs/shared-concepts.md`, "Radii vs perimeters"
- Test: pending (Phase 2, FrustumSupport core)

## Rotational phase between PaperPolyhedra and OpenSCAD

PaperPolyhedra's polygon walk puts *edge zero's midpoint* at −90°; the OpenSCAD modules put
*vertex zero* at 0°. Correction: rotate by `−90 − 180/n` degrees. Invisible at n = 4, tens of
millimetres out at n = 3 and n = 5.

- Source: `docs/shared-concepts.md`; `ScaffoldShell/Frame.pde`
- Test: pending (Phase 6, ScaffoldShell), with cases for n = 3, 4, 5

## Print scale vs cut scale

Print geometry uses `MM = 2.8346` (72 DPI), cut geometry `MM_V = MM · 96/72` (96 DPI). Mixing
them is 33 % wrong on the cutting mat. The web version works in mm and emits physical units,
so these constants should not appear outside one tested conversion in `src/lib/`.

- Source: `docs/shared-concepts.md`, "Units"
- Test: pending (Phase 1, `src/lib/units`)

## Frustum panel height is the slant height

When top and bottom perimeters differ, the panel height is the hypotenuse, not the vertical
rise. Using the vertical height makes a shape that is slightly too short and won't close.

- Source: `docs/shared-concepts.md`, "Frustums"
- Test: pending (Phase 5, PaperPolyhedra core)

## Variable polygons: circumradius by binary search

For per-edge widths `s[i]`, R is found by binary search so that `Σ 2·arcsin(s[i]/(2R)) = 2π`.
Non-convergence means the edges are not physically realisable.

- Source: `docs/shared-concepts.md`, "Variable polygons"
- Test: pending (Phase 5, PaperPolyhedra core)
