// Layer 1: cut-out outlines and checks.
import { describe, expect, it } from 'vitest';
import type { Point } from '../../../src/lib/drawing';
import { buildBlockSheet, ORIGIN } from '../../../src/tools/paperphicons/core/block';
import {
	baseFaceCentre,
	buildWidgetSheet,
	checkCutouts,
	CIRCLE_POINTS,
	cutoutOutline,
	DEFAULT_WIDGET,
	NEW_CUTOUT,
	PILL_SEGMENTS,
	type Cutout,
	type WidgetInput,
} from '../../../src/tools/phiconwidgets/core/cutouts';

const box = (points: Point[]) => ({
	minX: Math.min(...points.map((p) => p[0])),
	maxX: Math.max(...points.map((p) => p[0])),
	minY: Math.min(...points.map((p) => p[1])),
	maxY: Math.max(...points.map((p) => p[1])),
});
const cutout = (c: Partial<Cutout>): Cutout => ({ ...NEW_CUTOUT, ...c });
const widget = (w: Partial<WidgetInput>): WidgetInput => ({ ...DEFAULT_WIDGET, ...w });

describe('cutoutOutline', () => {
	it('draws a square around its offset centre', () => {
		expect(cutoutOutline(cutout({ width: 10, height: 4, x: 3, y: -2 }), [100, 50])).toEqual([
			[98, 46],
			[108, 46],
			[108, 50],
			[98, 50],
		]);
	});

	it('draws a circle as 64 points on its radius, starting on the right', () => {
		const pts = cutoutOutline(cutout({ shape: 'circle', width: 20, height: 999 }), [0, 0]);
		expect(pts).toHaveLength(CIRCLE_POINTS);
		expect(pts[0]).toEqual([10, 0]);
		for (const [x, y] of pts) expect(Math.hypot(x, y)).toBeCloseTo(10, 12);
	});

	it('draws a horizontal pill: flat top and bottom, half-circle ends of half its width', () => {
		const pts = cutoutOutline(cutout({ shape: 'pill', width: 40, height: 10 }), [0, 0]);
		expect(pts).toHaveLength(2 * (PILL_SEGMENTS + 1));
		const b = box(pts);
		expect([b.minX, b.maxX, b.minY, b.maxY].map((v) => Math.round(v * 1e9) / 1e9)).toEqual([-20, 20, -5, 5]);
		// Every point lies on one of the two end circles (radius 5 around x = ±15).
		for (const [x, y] of pts) expect(Math.hypot(Math.abs(x) - 15, y)).toBeCloseTo(5, 12);
	});

	it('turns a vertical pill: its length runs down the face', () => {
		const b = box(cutoutOutline(cutout({ shape: 'pill', width: 30, height: 12, vertical: true }), [0, 0]));
		expect([b.maxX - b.minX, b.maxY - b.minY].map((v) => Math.round(v * 1e9) / 1e9)).toEqual([12, 30]);
	});

	it('draws a pill whose width is its longer side along that side (as Processing does)', () => {
		const b = box(cutoutOutline(cutout({ shape: 'pill', width: 10, height: 30 }), [0, 0]));
		expect([b.maxX - b.minX, b.maxY - b.minY].map((v) => Math.round(v * 1e9) / 1e9)).toEqual([10, 30]);
	});
});

describe('baseFaceCentre', () => {
	it('is the centre of the W × L face, second column of the net', () => {
		// Columns H | W | H | W | H, rows H | L | H.
		expect(baseFaceCentre({ width: 40, length: 50, height: 15 }, [15, 15])).toEqual([15 + 15 + 20, 15 + 15 + 25]);
	});
});

describe('checkCutouts', () => {
	it('accepts a cut-out on the face, clear of a marker on the side wall', () => {
		expect(checkCutouts(widget({ markerOnSide: true, cutouts: [cutout({ shape: 'circle', width: 20 })] }))).toEqual({ errors: [], warnings: [] });
	});

	it('warns when a cut-out cuts into the marker or its white margin', () => {
		// Marker 16 mm: 20.57 mm with its margin, so ±10.29 mm around the centre; a 4 mm square
		// clears it from x = 12.29.
		const near = (x: number) => checkCutouts(widget({ cutouts: [cutout({ width: 4, height: 4, x })] })).warnings;
		expect(near(12.3)).toEqual([]);
		expect(near(12.25)).toHaveLength(1);
		expect(near(12.25)[0]).toMatch(/marker/);
	});

	it('uses the round ends of circles and pills for the marker check', () => {
		// A circle of radius 3 diagonal from the marker's corner (10.29, 10.29): it touches the
		// box around the marker but not the marker.
		const corner = (16 * 9) / 7 / 2;
		const d = 3 / Math.SQRT2 + corner + 0.05;
		expect(checkCutouts(widget({ width: 60, length: 60, cutouts: [cutout({ shape: 'circle', width: 6, x: d, y: d })] })).warnings).toEqual([]);
		expect(checkCutouts(widget({ width: 60, length: 60, cutouts: [cutout({ shape: 'square', width: 6, height: 6, x: d, y: d })] })).warnings).toHaveLength(1);
	});

	it('follows the marker offset', () => {
		const input = widget({ width: 60, length: 40, markerSize: 12, markerOffsetY: -12, cutouts: [cutout({ shape: 'pill', width: 40, height: 10, y: 10 })] });
		expect(checkCutouts(input).warnings).toEqual([]);
		expect(checkCutouts({ ...input, markerOffsetY: 0 }).warnings).toHaveLength(1);
	});

	it('warns when a cut-out reaches past the face', () => {
		const w = checkCutouts(widget({ markerOnSide: true, cutouts: [cutout({ width: 10, height: 10, x: 10.5 })] })).warnings;
		expect(w).toHaveLength(1);
		expect(w[0]).toMatch(/Cut-out 1 \(square\) reaches past/);
		expect(checkCutouts(widget({ markerOnSide: true, cutouts: [cutout({ width: 10, height: 10, x: 10 })] })).warnings).toEqual([]);
	});

	it('rejects sizes of 0 (a circle only needs a diameter)', () => {
		expect(checkCutouts(widget({ cutouts: [cutout({ height: 0 })] })).errors).toHaveLength(1);
		expect(checkCutouts(widget({ markerOnSide: true, cutouts: [cutout({ shape: 'circle', width: 8, height: 0 })] })).errors).toEqual([]);
	});
});

describe('buildWidgetSheet', () => {
	const input = widget({ copies: 3, markerOnSide: true, cutouts: [cutout({ shape: 'circle', width: 10 }), cutout({ width: 5, height: 5, x: 8 })] });

	it('is the PaperPhicons sheet with each copy’s cut-outs drawn before its net', () => {
		const plain = buildBlockSheet(input).sheet.paths;
		const paths = buildWidgetSheet(input).sheet.paths;
		expect(paths).toHaveLength(plain.length + 3 * 2);
		const perCopy = plain.length / 3;
		for (let i = 0; i < 3; i++) {
			const start = i * (perCopy + 2);
			expect(paths.slice(start, start + 2).every((p) => p.kind === 'cut' && p.closed)).toBe(true);
			expect(paths.slice(start + 2, start + 2 + perCopy)).toEqual(plain.slice(i * perCopy, (i + 1) * perCopy));
		}
	});

	it('centres the first copy’s cut-outs on its base face', () => {
		const first = buildWidgetSheet(input).sheet.paths[0];
		const b = box(first.points);
		expect([(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2]).toEqual(baseFaceCentre(input, ORIGIN));
	});

	it('adds the cut-out checks to the block’s', () => {
		const result = buildWidgetSheet(widget({ markerSize: 40, cutouts: [cutout({ height: -1 })] }));
		expect(result.errors).toHaveLength(1);
		expect(result.warnings.some((w) => /larger than its/.test(w))).toBe(true);
	});

	it('warns when the marker offset pushes it off its face', () => {
		expect(buildWidgetSheet(widget({ markerOffsetY: 4 })).warnings).toEqual([]);
		expect(buildWidgetSheet(widget({ markerOffsetY: 5 })).warnings[0]).toMatch(/runs off its face/);
	});
});
