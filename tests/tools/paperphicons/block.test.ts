// Layer 1: geometry of the block net and markers, independent of the Processing fixtures.
import { describe, expect, it } from 'vitest';
import { segmentsOf, toCutterPaths, type Path, type Point } from '../../../src/lib/drawing';
import { foldSvg } from '../../../src/lib/export';
import { arucoOriginalBits } from '../../../src/tools/paperphicons/core/aruco';
import {
	blockPaths,
	blockSpacing,
	buildBlockSheet,
	DASH,
	DEFAULT_BLOCK,
	gridLines,
	markerCentre,
	markerPaths,
	THICKNESS,
} from '../../../src/tools/paperphicons/core/block';
import { parseSvg } from '../../helpers/svg';

const len = ([a, b]: [Point, Point]) => Math.hypot(b[0] - a[0], b[1] - a[1]);

describe('block net', () => {
	const input = { ...DEFAULT_BLOCK, width: 40, length: 60, height: 20 };
	const paths = blockPaths(input, [0, 0]);
	const { x, y } = gridLines(input);

	it('has columns H | W | H | W | H and rows H | L | H', () => {
		expect(x).toEqual([0, 20, 60, 80, 120, 140]);
		expect(y).toEqual([0, 20, 80, 100]);
	});

	it('has 45° corner gussets whose diagonals span one H × H square', () => {
		const back = paths.filter((p) => p.colour === '#0000ff');
		expect(back).toHaveLength(4);
		for (const p of back) {
			const [[x0, y0], [x1, y1]] = p.points;
			expect(Math.abs(x1 - x0)).toBeCloseTo(20, 12);
			expect(Math.abs(y1 - y0)).toBeCloseTo(20, 12);
		}
	});

	it('insets the lid by the paper thickness', () => {
		const lidFold = paths.find((p) => p.kind === 'fold' && p.points[0][0] === x[4] - THICKNESS);
		expect(lidFold).toBeDefined();
		expect(len(lidFold!.points as [Point, Point])).toBeCloseTo(input.length - 2 * THICKNESS, 12);
	});

	it('scores folds with 3 mm dashes and 3 mm gaps', () => {
		const dashes = toCutterPaths(paths.filter((p) => p.kind === 'fold')).flatMap(segmentsOf);
		expect(Math.max(...dashes.map((s) => len(s as [Point, Point])))).toBeCloseTo(DASH[0], 12);
	});
});

describe('marker', () => {
	const centre: Point = [100, 100];
	const paths = markerPaths(48, 16, centre);

	it('is a black square of exactly the marker size, centred', () => {
		const [square] = paths;
		expect(square.fill).toBe('#000000');
		expect(square.points).toEqual([
			[92, 92],
			[108, 92],
			[108, 108],
			[92, 108],
		]);
	});

	it('has white cells exactly where the dictionary has 1 bits', () => {
		const cell = 16 / 7;
		const white = paths.slice(1);
		const isWhite = (r: number, c: number) => {
			const [px, py] = [92 + (1.5 + c) * cell, 92 + (1.5 + r) * cell];
			return white.some((p: Path) => {
				const xs = p.points.map((q) => q[0]);
				const ys = p.points.map((q) => q[1]);
				return px > Math.min(...xs) && px < Math.max(...xs) && py > Math.min(...ys) && py < Math.max(...ys);
			});
		};
		const bits = arucoOriginalBits(48);
		for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) expect(isWhite(r, c)).toBe(bits[r][c] === 1);
	});

	it('sits on the base or, with markerOnSide, on the right wall', () => {
		expect(markerCentre({ ...DEFAULT_BLOCK, width: 40, length: 60, height: 20 }, [0, 0])).toEqual([40, 50]);
		expect(markerCentre({ ...DEFAULT_BLOCK, width: 40, length: 60, height: 20, markerOnSide: true }, [0, 0])).toEqual([70, 50]);
	});
});

describe('sheet', () => {
	it('numbers copies from the first marker id and spaces them like the print', () => {
		const sheet = buildBlockSheet({ ...DEFAULT_BLOCK, width: 30, length: 30, height: 30, copies: 3, firstMarkerId: 5 });
		expect(sheet.markerIds).toEqual([5, 6, 7]);
		expect(blockSpacing({ ...DEFAULT_BLOCK, width: 30, length: 30, height: 30 })).toEqual([149, 90]);
		expect(sheet.sheet.labels?.map((l) => l.text)).toEqual(['5', '6', '7']);
	});

	it('refuses marker ids outside the dictionary', () => {
		expect(buildBlockSheet({ ...DEFAULT_BLOCK, firstMarkerId: 1022, copies: 3 }).errors).toHaveLength(1);
		expect(buildBlockSheet({ ...DEFAULT_BLOCK, firstMarkerId: 1021, copies: 3 }).errors).toHaveLength(0);
	});

	it('warns when the marker and its margin are larger than the face', () => {
		expect(buildBlockSheet({ ...DEFAULT_BLOCK, markerOnSide: true, height: 20, markerSize: 16 }).warnings).toHaveLength(1);
		expect(buildBlockSheet(DEFAULT_BLOCK).warnings).toHaveLength(0);
	});

	it('exports a 280 × 200 mm cut file with no marker in it', () => {
		const parsed = parseSvg(foldSvg(buildBlockSheet(DEFAULT_BLOCK).sheet));
		expect([parsed.width, parsed.height]).toEqual(['280mm', '200mm']);
		const cutter = toCutterPaths(buildBlockSheet(DEFAULT_BLOCK).sheet.paths);
		expect(cutter.every((p) => p.kind !== 'print')).toBe(true);
	});
});
