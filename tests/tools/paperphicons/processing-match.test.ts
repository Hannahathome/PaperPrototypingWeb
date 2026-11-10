// Layer 2: the web block net against real PaperPhicons exports (tests/fixtures/paperphicons).
//
// PaperPhicons shifts its cut SVGs by (5, 5) mm relative to the print; the web version follows
// the shared convention instead, so the SVG is compared after removing that shift. Its PDF
// crosses differ from the shared ones and are left out. With several copies Processing's cut
// file is wrong (copies at 75 % spacing), so copies are compared against the print PDF.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { segmentsOf, toCutterPaths, type Point } from '../../../src/lib/drawing';
import { arucoOriginalBits } from '../../../src/tools/paperphicons/core/aruco';
import { blockPaths, blockSpacing, buildBlockSheet, markerCentre, ORIGIN, THICKNESS, type BlockInput } from '../../../src/tools/paperphicons/core/block';
import { paintedPaths, pdfContent, strokedSegments } from '../../helpers/pdf';
import { PROCESSING_MM, PROCESSING_MM_V } from '../../helpers/processing';
import { parseSvg, segmentsInMm, unmatchedSegments, withoutDegenerate, type Segment } from '../../helpers/svg';

const DIR = 'tests/fixtures/paperphicons';
const TOLERANCE = 0.1;
const MIN_SEGMENT = 0.01;
/** thickMM left at print scale (0.5 × MM) and drawn at cut scale (MM_V): 0.5 × 72/96 mm. */
const PROCESSING_CUT_FOLD_THICKNESS = THICKNESS * (72 / 96);
const SVG_SHIFT = 5;

interface Case {
	id: string;
	width: number;
	length: number;
	height: number;
	markerId: number;
	markerSize: number;
	repeat: number;
	markerOnSide: boolean;
}

const cases = readdirSync(DIR, { withFileTypes: true })
	.filter((e) => e.isDirectory())
	.map((e) => {
		const c = JSON.parse(readFileSync(join(DIR, e.name, 'params.json'), 'utf8')) as Case;
		const input: BlockInput = {
			width: c.width,
			length: c.length,
			height: c.height,
			firstMarkerId: c.markerId,
			markerSize: c.markerSize,
			copies: c.repeat,
			markerOnSide: c.markerOnSide,
		};
		return { c, input, dir: join(DIR, e.name) };
	});

const webCutterSegments = (input: BlockInput) =>
	withoutDegenerate(toCutterPaths(buildBlockSheet(input).sheet.paths).flatMap(segmentsOf) as Segment[], MIN_SEGMENT);

/** Processing's PDF crosses: ±5 mm around (10, 10), (270, 10), (10, 190), (270, 190). */
const isProcessingCross = ([a, b]: Segment) =>
	[10, 270].some((cx) => [10, 190].some((cy) => Math.hypot((a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cy) < 0.2 && Math.hypot(b[0] - a[0], b[1] - a[1]) > 9.5));

describe('PaperPhicons block net matches Processing', () => {
	it('has fixtures', () => expect(cases.length).toBeGreaterThanOrEqual(3));

	it.each(cases.filter(({ c }) => c.repeat === 1).map((x) => [x.c.id, x] as const))('cut SVG: %s', (_, { input, dir }) => {
		const svg = parseSvg(readFileSync(join(dir, 'fold.svg'), 'utf8'));
		const expected = withoutDegenerate(segmentsInMm(svg.segments, PROCESSING_MM_V), MIN_SEGMENT).map(
			([a, b]): Segment => [
				[a[0] - SVG_SHIFT, a[1] - SVG_SHIFT],
				[b[0] - SVG_SHIFT, b[1] - SVG_SHIFT],
			],
		);
		const asProcessing = withoutDegenerate(
			toCutterPaths(blockPaths(input, ORIGIN, { foldThickness: PROCESSING_CUT_FOLD_THICKNESS })).flatMap(segmentsOf) as Segment[],
			MIN_SEGMENT,
		);
		const { missing, extra } = unmatchedSegments(asProcessing, expected, TOLERANCE);
		expect({ missing: missing.slice(0, 3), extra: extra.slice(0, 3) }).toEqual({ missing: [], extra: [] });
	});

	it.each(cases.map((x) => [x.c.id, x] as const))('print PDF lines: %s', (_, { input, dir }) => {
		const paths = paintedPaths(pdfContent(readFileSync(join(dir, 'print.pdf'))), 595, PROCESSING_MM);
		const expected = withoutDegenerate(strokedSegments(paths), MIN_SEGMENT).filter((s) => !isProcessingCross(s));
		const { missing, extra } = unmatchedSegments(webCutterSegments(input), expected, TOLERANCE);
		expect({ missing: missing.slice(0, 3), extra: extra.slice(0, 3) }).toEqual({ missing: [], extra: [] });
	});

	it.each(cases.map((x) => [x.c.id, x] as const))('print PDF markers (pattern and position): %s', (_, { input, dir }) => {
		const paths = paintedPaths(pdfContent(readFileSync(join(dir, 'print.pdf'))), 595, PROCESSING_MM);
		// Processing draws each marker cell as a filled square (4 corners, the first repeated); the
		// label is glyph outlines with many points.
		const blackCells = paths
			.filter((p) => p.paint === 'fill' && p.colour.every((v) => v === 0))
			.flatMap((p) => p.subpaths)
			.filter((s) => s.points.length === 4 || s.points.length === 5)
			.map((s) => ({
				minX: Math.min(...s.points.map((q) => q[0])),
				maxX: Math.max(...s.points.map((q) => q[0])),
				minY: Math.min(...s.points.map((q) => q[1])),
				maxY: Math.max(...s.points.map((q) => q[1])),
			}));
		const isBlack = ([x, y]: Point) => blackCells.some((r) => x > r.minX && x < r.maxX && y > r.minY && y < r.maxY);
		const [dx, dy] = blockSpacing(input);
		const cell = input.markerSize / 7;

		for (let i = 0; i < input.copies; i++) {
			const centre = markerCentre(input, [ORIGIN[0] + (i % 2) * dx, ORIGIN[1] + Math.floor(i / 2) * dy]);
			const bits = arucoOriginalBits(input.firstMarkerId + i);
			const seen: string[] = [];
			const want: string[] = [];
			for (let r = 0; r < 9; r++) {
				for (let c = 0; c < 9; c++) {
					// Sample each cell's centre on the web grid; Processing's rounded cells overlap it.
					const at: Point = [centre[0] + (c - 4) * cell, centre[1] + (r - 4) * cell];
					const border = r === 0 || r === 8 || c === 0 || c === 8;
					const frame = r === 1 || r === 7 || c === 1 || c === 7;
					want.push(border ? '.' : frame ? '#' : bits[r - 2][c - 2] ? '.' : '#');
					seen.push(isBlack(at) ? '#' : '.');
				}
			}
			expect(seen.join(''), `marker ${input.firstMarkerId + i}`).toBe(want.join(''));
		}
	});
});

describe('Processing’s cut file with several copies (documented bug, fixed in the web version)', () => {
	it('places the cut copies at 75 % of the printed spacing', () => {
		const three = cases.find(({ c }) => c.repeat === 3);
		expect(three).toBeDefined();
		const { input, dir } = three!;
		const svg = parseSvg(readFileSync(join(dir, 'fold.svg'), 'utf8'));
		const processing = withoutDegenerate(segmentsInMm(svg.segments, PROCESSING_MM_V), MIN_SEGMENT).map(
			([a, b]): Segment => [
				[a[0] - SVG_SHIFT, a[1] - SVG_SHIFT],
				[b[0] - SVG_SHIFT, b[1] - SVG_SHIFT],
			],
		);
		const [dx, dy] = blockSpacing(input);
		const copyAt = (scale: number, i: number): Segment[] =>
			withoutDegenerate(
				toCutterPaths(
					// Only the first copy's folds use the stale print-scale thickness; later copies pick
					// up the cut-scale value set by the copy before.
					blockPaths(input, [ORIGIN[0] + (i % 2) * dx * scale, ORIGIN[1] + Math.floor(i / 2) * dy * scale], {
						foldThickness: i === 0 ? PROCESSING_CUT_FOLD_THICKNESS : THICKNESS,
					}),
				).flatMap(segmentsOf) as Segment[],
				MIN_SEGMENT,
			);
		const atThreeQuarters = [0, 1, 2].flatMap((i) => copyAt(0.75, i));
		expect(unmatchedSegments(atThreeQuarters, processing, TOLERANCE)).toEqual({ missing: [], extra: [] });
		// The web cut file uses the printed spacing, so its copies land on the printed ones.
		const web = webCutterSegments(input);
		expect(unmatchedSegments(web, processing, TOLERANCE).missing.length).toBeGreaterThan(0);
	});
});
