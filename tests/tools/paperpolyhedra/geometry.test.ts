// Layer 1: geometric facts the net must satisfy, independent of the Processing fixtures.
import { describe, expect, it } from 'vitest';
import type { Point } from '../../../src/lib/drawing';
import { buildNet, lidDimensions } from '../../../src/tools/paperpolyhedra/core/net';
import { apothem, circumradius, perimeterFromDiameter, shapeDims, type ShapeInput } from '../../../src/tools/paperpolyhedra/core/params';

const base: ShapeInput = { sides: 6, topDiameter: 50, bottomDiameter: 50, height: 50, tabDepth: 15, flapDepth: 5, flapTaper: 5 };
const dist = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const shapes: [string, ShapeInput][] = [
	['triangle prism', { ...base, sides: 3, topDiameter: 60, bottomDiameter: 60 }],
	['square prism', { ...base, sides: 4, topDiameter: 40, bottomDiameter: 40 }],
	['hexagon prism', base],
	['octagon frustum', { ...base, sides: 8, topDiameter: 40, bottomDiameter: 60 }],
	['inverted pentagon frustum', { ...base, sides: 5, topDiameter: 60, bottomDiameter: 40 }],
];

describe('perimeter from the Processing "diameter"', () => {
	it('is the side length for squares', () => {
		expect(perimeterFromDiameter(4, 40)).toBe(160);
	});

	it('is the circumscribed diameter for other polygons', () => {
		expect(perimeterFromDiameter(6, 50)).toBeCloseTo(150, 10); // hexagon side = radius
		expect(perimeterFromDiameter(3, 60)).toBeCloseTo(3 * 60 * Math.sin(Math.PI / 3), 10);
	});

	it('round-trips through the circumradius', () => {
		for (const n of [3, 5, 6, 8, 12]) {
			expect(2 * circumradius(n, perimeterFromDiameter(n, 70) / n)).toBeCloseTo(70, 10);
		}
	});
});

describe('clamping (Processing setParams)', () => {
	it('limits tab depth to half the shortest side and half the panel height', () => {
		expect(shapeDims({ ...base, sides: 4, topDiameter: 20, bottomDiameter: 20, tabDepth: 15 }).tabDepth).toBe(10);
		expect(shapeDims({ ...base, height: 12, tabDepth: 15 }).tabDepth).toBe(6);
	});

	it('limits flap depth to half a side and taper to 0.33 × panel height', () => {
		expect(shapeDims({ ...base, sides: 4, topDiameter: 8, bottomDiameter: 8, flapDepth: 5 }).flapDepth).toBe(4);
		expect(shapeDims({ ...base, height: 9, flapTaper: 5 }).flapTaper).toBeCloseTo(2.97, 10);
	});
});

describe('frustum panel height (kept as Processing computes it)', () => {
	it('prisms fold to exactly the entered height', () => {
		expect(shapeDims(base).foldedHeight).toBeCloseTo(50, 10);
	});

	it('uses √(h² + (bottom side − top side)²) for the panel', () => {
		const d = shapeDims({ ...base, sides: 4, topDiameter: 25, bottomDiameter: 45 });
		expect(d.panelHeight).toBeCloseTo(Math.hypot(50, 20), 10);
	});

	it('reports the height the net really folds to', () => {
		const d = shapeDims({ ...base, sides: 4, topDiameter: 25, bottomDiameter: 45 });
		const apothemDiff = apothem(4, 45) - apothem(4, 25);
		expect(d.foldedHeight).toBeCloseTo(Math.sqrt(d.panelHeight ** 2 - apothemDiff ** 2), 10);
		expect(d.foldedHeight).toBeGreaterThan(50);
	});
});

describe.each(shapes)('%s net', (_, input) => {
	const net = buildNet(input);
	const { dims } = net;

	it('has one panel per side with the right edge lengths', () => {
		expect(net.panels).toHaveLength(dims.sides);
		for (const { corners: [bl, br, tr, tl] } of net.panels) {
			expect(dist(bl, br)).toBeCloseTo(dims.bottomSide, 9);
			expect(dist(tl, tr)).toBeCloseTo(dims.topSide, 9);
			expect(dist(bl, tl)).toBeCloseTo(dist(br, tr), 9); // isosceles
		}
	});

	it('joins neighbouring panels along a shared edge', () => {
		for (let i = 0; i + 1 < net.panels.length; i++) {
			const [, br, tr] = net.panels[i].corners;
			const [bl, , , tl] = net.panels[i + 1].corners;
			expect(dist(br, bl)).toBeLessThan(1e-9);
			expect(dist(tr, tl)).toBeLessThan(1e-9);
		}
	});

	it('has lids whose sides equal the strip edges they fold onto', () => {
		for (const [lid, side] of [
			[net.bottomLid, dims.bottomSide],
			[net.topLid, dims.topSide],
		] as const) {
			expect(lid.corners).toHaveLength(dims.sides);
			lid.corners.forEach((corner, i) => {
				expect(dist(corner, lid.corners[(i + 1) % dims.sides])).toBeCloseTo(side, 9);
				expect(dist(corner, lid.centre)).toBeCloseTo(circumradius(dims.sides, side), 9);
			});
		}
	});

	it('places the lids below the strip without overlapping it', () => {
		const stripBottom = Math.max(...net.panels.flatMap((p) => p.corners.map((c) => c[1])));
		const lidTop = Math.min(...[...net.bottomLid.corners, ...net.topLid.corners].map((c) => c[1]));
		expect(lidTop).toBeGreaterThan(stripBottom + dims.tabDepth);
	});
});

describe('lidDimensions', () => {
	it('is the polygon bounding box plus a tab on each side', () => {
		const square = lidDimensions(4, 40, 10);
		expect(square.width).toBeCloseTo(60, 10);
		expect(square.height).toBeCloseTo(60, 10);
	});
});
