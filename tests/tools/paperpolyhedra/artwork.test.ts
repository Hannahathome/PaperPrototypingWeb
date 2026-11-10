import { describe, expect, it } from 'vitest';
import type { Point } from '../../../src/lib/drawing';
import { buildArtwork, lidTriangles, perPanelTriangles, STRIP_DENSITY, stripTriangles, TESSELLATION_DENSITY } from '../../../src/tools/paperpolyhedra/core/artwork';
import { buildNet } from '../../../src/tools/paperpolyhedra/core/net';

const net = buildNet({ sides: 5, topDiameter: 40, bottomDiameter: 60, height: 50, tabDepth: 15, flapDepth: 5, flapTaper: 5 });
const close = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9;

describe('per-panel images', () => {
	const triangles = perPanelTriangles(net.panels, [true, false, true, true, true]);

	it('draws two triangles for each panel that has an image', () => {
		expect(triangles).toHaveLength(8);
		expect(triangles.every((t) => t.slot.kind === 'panel' && t.slot.index !== 1)).toBe(true);
	});

	it('puts the image top-left on the bottom-left corner (model bottom rim) and bottom-right on the top-right', () => {
		const [bl, , tr] = net.panels[0].corners;
		const points = triangles.slice(0, 2).flatMap((t) => t.points.map((p, i) => ({ p, uv: t.uvs[i] })));
		expect(points.find((x) => close(x.p, bl))?.uv).toEqual([0, 0]);
		expect(points.find((x) => close(x.p, tr))?.uv).toEqual([1, 1]);
	});
});

describe('strip image', () => {
	const triangles = stripTriangles(net.panels);

	it('tessellates each panel at half the density', () => {
		expect(triangles).toHaveLength(net.panels.length * STRIP_DENSITY * STRIP_DENSITY * 2);
	});

	it('gives each panel an equal share of the image width, continuous across folds', () => {
		const n = net.panels.length;
		net.panels.forEach((panel, i) => {
			const [bl, br] = panel.corners;
			const all = triangles.flatMap((t) => t.points.map((p, k) => ({ p, uv: t.uvs[k] })));
			const uvAt = (p: Point) => all.find((x) => close(x.p, p))?.uv;
			expect(uvAt(bl)?.[0]).toBeCloseTo(i / n, 12);
			expect(uvAt(br)?.[0]).toBeCloseTo((i + 1) / n, 12);
			expect(uvAt(bl)?.[1]).toBe(0);
		});
	});
});

describe('lid images', () => {
	it('maps the inscribed disc of the image onto the circumcircle, centred', () => {
		const triangles = lidTriangles(net.topLid, 2, { kind: 'topLid' });
		expect(triangles).toHaveLength(net.dims.sides * TESSELLATION_DENSITY * TESSELLATION_DENSITY * 2);
		const all = triangles.flatMap((t) => t.points.map((p, k) => ({ p, uv: t.uvs[k] })));
		expect(all.find((x) => close(x.p, net.topLid.centre))?.uv).toEqual([0.5, 0.5]);
		// Wide image (2:1): the disc spans the full height and the middle half of the width.
		const us = all.map((x) => x.uv[0]);
		const vs = all.map((x) => x.uv[1]);
		expect(Math.min(...us)).toBeCloseTo(0.25, 6);
		expect(Math.max(...us)).toBeCloseTo(0.75, 6);
		expect(Math.min(...vs)).toBeCloseTo(0, 2);
		expect(Math.max(...vs)).toBeCloseTo(1, 2);
	});
});

describe('buildArtwork', () => {
	it('prints lid images only together with a side image, as Processing does', () => {
		expect(buildArtwork(net, { sideMode: 'none', topLidAspect: 1, bottomLidAspect: 1 }).triangles).toHaveLength(0);
		expect(buildArtwork(net, { sideMode: 'strip', topLidAspect: 1 }).triangles.some((t) => t.slot.kind === 'topLid')).toBe(true);
	});

	it('fills every panel and both lids with the colour', () => {
		const { fills } = buildArtwork(net, { sideMode: 'none', fill: '#ff8800' });
		expect(fills).toHaveLength(net.panels.length + 2);
		expect(fills.every((f) => f.kind === 'print' && f.fill === '#ff8800' && f.closed)).toBe(true);
	});
});
