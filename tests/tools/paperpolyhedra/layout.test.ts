import { describe, expect, it } from 'vitest';
import { segmentsOf, type Point } from '../../../src/lib/drawing';
import { arrangeOffsets, boundsOverlap, CROSS_ZONE, insideCutArea, netBounds, offsetIntoFreeSpot, overlappingPairs, touchesCrossZone, translateNet } from '../../../src/tools/paperpolyhedra/core/layout';
import { buildNet } from '../../../src/tools/paperpolyhedra/core/net';
import type { ShapeInput } from '../../../src/tools/paperpolyhedra/core/params';

const shape = (sides: number, diameter: number, height: number): ShapeInput => ({
	sides,
	topDiameter: diameter,
	bottomDiameter: diameter,
	height,
	tabDepth: 5,
	flapDepth: 5,
	flapTaper: 5,
});

describe('translateNet', () => {
	it('moves every path, panel and lid by the offset and nothing else', () => {
		const net = buildNet(shape(5, 40, 30));
		const moved = translateNet(net, [12.5, -3]);
		const a = net.sheet.paths.flatMap(segmentsOf);
		const b = moved.sheet.paths.flatMap(segmentsOf);
		a.forEach(([p, q], i) => {
			expect(b[i][0]).toEqual([p[0] + 12.5, p[1] - 3]);
			expect(b[i][1]).toEqual([q[0] + 12.5, q[1] - 3]);
		});
		expect(moved.topLid.centre).toEqual([net.topLid.centre[0] + 12.5, net.topLid.centre[1] - 3]);
		expect(moved.panels[2].corners[1]).toEqual([net.panels[2].corners[1][0] + 12.5, net.panels[2].corners[1][1] - 3]);
	});
});

describe('arrangeOffsets', () => {
	const nets = [shape(4, 20, 30), shape(6, 25, 25), shape(3, 30, 20), shape(5, 20, 40), shape(4, 15, 15)].map((s) => buildNet(s));
	const bounds = nets.map(netBounds);
	const offsets = arrangeOffsets(bounds);
	const placed = nets.map((n, i) => netBounds(translateNet(n, offsets[i])));

	it('places small nets inside the cutting area without overlaps, below the top crosses', () => {
		for (const b of placed) expect(insideCutArea(b)).toBe(true);
		for (const b of placed) expect(b.minY).toBeGreaterThanOrEqual(CROSS_ZONE - 1e-9);
		for (const b of placed) expect(touchesCrossZone(b)).toBe(false);
		expect(overlappingPairs(placed)).toEqual([]);
	});

	it('keeps the gap between neighbours', () => {
		for (let i = 0; i + 1 < placed.length; i++) {
			if (Math.abs(placed[i].minY - placed[i + 1].minY) < 1e-9) {
				expect(placed[i + 1].minX - placed[i].maxX).toBeCloseTo(3, 9);
			}
		}
	});

	it('puts nets that do not fit outside the cutting area, never on top of others', () => {
		const many = Array.from({ length: 12 }, () => buildNet(shape(6, 40, 50)));
		const off = arrangeOffsets(many.map(netBounds));
		const b = many.map((n, i) => netBounds(translateNet(n, off[i])));
		expect(overlappingPairs(b)).toEqual([]);
		expect(b.some((x) => !insideCutArea(x))).toBe(true);
	});
});

describe('offsetIntoFreeSpot', () => {
	it('adds a net next to nets the user placed, without moving them or overlapping', () => {
		const net = buildNet(shape(4, 20, 30));
		const b = netBounds(net);
		const placed = [{ minX: 40, minY: 30, maxX: 120, maxY: 110 }];
		const offset = offsetIntoFreeSpot(placed, b)!;
		const moved = netBounds(translateNet(net, offset));
		expect(boundsOverlap(moved, placed[0])).toBe(false);
		expect(insideCutArea(moved)).toBe(true);
		expect(touchesCrossZone(moved)).toBe(false);
	});

	it('returns null when the sheet is full', () => {
		const full = [{ minX: 0, minY: 0, maxX: 280, maxY: 200 }];
		expect(offsetIntoFreeSpot(full, netBounds(buildNet(shape(4, 20, 30))))).toBeNull();
	});
});

describe('calibration cross zones', () => {
	it('flags nets that reach a corner where a cross is cut', () => {
		expect(touchesCrossZone({ minX: 5, minY: 30, maxX: 40, maxY: 60 })).toBe(false);
		expect(touchesCrossZone({ minX: 5, minY: 15, maxX: 40, maxY: 60 })).toBe(true);
		expect(touchesCrossZone({ minX: 250, minY: 150, maxX: 265, maxY: 185 })).toBe(true);
	});
});

describe('overlap', () => {
	it('detects overlapping and touching boxes correctly', () => {
		const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
		expect(boundsOverlap(a, { minX: 5, minY: 5, maxX: 15, maxY: 15 })).toBe(true);
		expect(boundsOverlap(a, { minX: 10, minY: 0, maxX: 20, maxY: 10 })).toBe(false);
	});

	it('flags nets moved on top of each other', () => {
		const net = buildNet(shape(4, 20, 30));
		const b = [netBounds(net), netBounds(translateNet(net, [5, 5] as Point))];
		expect(overlappingPairs(b)).toEqual([[0, 1]]);
	});
});
