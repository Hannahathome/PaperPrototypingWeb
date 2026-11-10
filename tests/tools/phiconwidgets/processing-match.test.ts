// Layer 2: the Phicon Widgets sheet against real exports of the TEI'27 sketch
// PaperPhicons_Boilerplate_v1_1_Cutout (tests/fixtures/phiconwidgets).
//
// As in PaperPhicons, the sketch shifts its cut SVGs by (5, 5) mm relative to the print and the
// web version does not, so the SVG is compared after removing that shift; its PDF crosses differ
// from the shared ones and are left out; with several copies its cut file places copies at 75 %
// of the printed spacing, so copies are compared against the print PDF.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { segmentsOf, toCutterPaths, type Point } from '../../../src/lib/drawing';
import { arucoOriginalBits } from '../../../src/tools/paperphicons/core/aruco';
import { blockPaths, blockSpacing, markerCentre, ORIGIN, THICKNESS } from '../../../src/tools/paperphicons/core/block';
import { buildWidgetSheet, cutoutPaths, type Cutout, type WidgetInput } from '../../../src/tools/phiconwidgets/core/cutouts';
import { paintedPaths, pdfContent, strokedSegments } from '../../helpers/pdf';
import { PROCESSING_MM, PROCESSING_MM_V } from '../../helpers/processing';
import { parseSvg, segmentsInMm, unmatchedSegments, withoutDegenerate, type Segment } from '../../helpers/svg';

const DIR = 'tests/fixtures/phiconwidgets';
const TOLERANCE = 0.1;
const MIN_SEGMENT = 0.01;
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
	markerOffsetY: number;
	cutouts: Cutout[];
}

const cases = readdirSync(DIR, { withFileTypes: true })
	.filter((e) => e.isDirectory())
	.map((e) => {
		const c = JSON.parse(readFileSync(join(DIR, e.name, 'params.json'), 'utf8')) as Case;
		const input: WidgetInput = {
			width: c.width,
			length: c.length,
			height: c.height,
			firstMarkerId: c.markerId,
			markerSize: c.markerSize,
			copies: c.repeat,
			markerOnSide: c.markerOnSide,
			markerOffsetY: c.markerOffsetY,
			cutouts: c.cutouts,
		};
		return { c, input, dir: join(DIR, e.name) };
	});

const segments = (paths: Parameters<typeof toCutterPaths>[0]) => withoutDegenerate(toCutterPaths(paths).flatMap(segmentsOf) as Segment[], MIN_SEGMENT);

/** The sketch's PDF crosses: ±5 mm around (10, 10), (270, 10), (10, 190), (270, 190). */
const isProcessingCross = ([a, b]: Segment) =>
	[10, 270].some((cx) => [10, 190].some((cy) => Math.hypot((a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cy) < 0.2 && Math.hypot(b[0] - a[0], b[1] - a[1]) > 9.5));

const processingCutFile = (dir: string) =>
	withoutDegenerate(segmentsInMm(parseSvg(readFileSync(join(dir, 'fold.svg'), 'utf8')).segments, PROCESSING_MM_V), MIN_SEGMENT).map(
		([a, b]): Segment => [
			[a[0] - SVG_SHIFT, a[1] - SVG_SHIFT],
			[b[0] - SVG_SHIFT, b[1] - SVG_SHIFT],
		],
	);

describe('Phicon Widgets sheet matches the TEI’27 sketch', () => {
	it('has fixtures, with cut-outs of every shape', () => {
		expect(cases.length).toBeGreaterThanOrEqual(4);
		const shapes = new Set(cases.flatMap(({ c }) => c.cutouts.map((k) => (k.shape === 'pill' ? `pill-${k.vertical}` : k.shape))));
		expect([...shapes].sort()).toEqual(['circle', 'pill-false', 'pill-true', 'square']);
	});

	it.each(cases.filter(({ c }) => c.repeat === 1).map((x) => [x.c.id, x] as const))('cut SVG: %s', (_, { input, dir }) => {
		const web = segments([...cutoutPaths(input, ORIGIN), ...blockPaths(input, ORIGIN)]);
		const { missing, extra } = unmatchedSegments(web, processingCutFile(dir), TOLERANCE);
		expect({ missing: missing.slice(0, 3), extra: extra.slice(0, 3) }).toEqual({ missing: [], extra: [] });
	});

	it.each(cases.map((x) => [x.c.id, x] as const))('print PDF lines: %s', (_, { input, dir }) => {
		const paths = paintedPaths(pdfContent(readFileSync(join(dir, 'print.pdf'))), 595, PROCESSING_MM);
		const expected = withoutDegenerate(strokedSegments(paths), MIN_SEGMENT).filter((s) => !isProcessingCross(s));
		const { missing, extra } = unmatchedSegments(segments(buildWidgetSheet(input).sheet.paths), expected, TOLERANCE);
		expect({ missing: missing.slice(0, 3), extra: extra.slice(0, 3) }).toEqual({ missing: [], extra: [] });
	});

	it.each(cases.map((x) => [x.c.id, x] as const))('print PDF markers, with their offset: %s', (_, { input, dir }) => {
		const paths = paintedPaths(pdfContent(readFileSync(join(dir, 'print.pdf'))), 595, PROCESSING_MM);
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

describe('the sketch’s cut file with several copies (same bug as PaperPhicons, fixed in the web version)', () => {
	it('places the cut copies, cut-outs included, at 75 % of the printed spacing', () => {
		const two = cases.find(({ c }) => c.repeat === 2);
		expect(two).toBeDefined();
		const { input, dir } = two!;
		const [dx, dy] = blockSpacing(input);
		const copyAt = (scale: number, i: number) => {
			const at: Point = [ORIGIN[0] + (i % 2) * dx * scale, ORIGIN[1] + Math.floor(i / 2) * dy * scale];
			return segments([...cutoutPaths(input, at), ...blockPaths(input, at, { foldThickness: THICKNESS })]);
		};
		const processing = processingCutFile(dir);
		expect(unmatchedSegments([0, 1].flatMap((i) => copyAt(0.75, i)), processing, TOLERANCE)).toEqual({ missing: [], extra: [] });
		expect(unmatchedSegments(segments(buildWidgetSheet(input).sheet.paths), processing, TOLERANCE).missing.length).toBeGreaterThan(0);
	});
});
