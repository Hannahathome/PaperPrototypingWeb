import { describe, expect, it } from 'vitest';
import { cutCrosses } from '../../../src/lib/calibration';
import { segmentsOf, type Path } from '../../../src/lib/drawing';
import { calibSvg, fitsCutArea, foldSvg } from '../../../src/lib/export';
import { buildPdf } from '../../../src/lib/pdf';
import {
	BAND_HALF_WIDTH,
	calibrationTestSheet,
	CUT_TARGETS,
	FOLD_TARGET,
	MEASURE_LINES,
} from '../../../src/tools/calibration/core/sheet';
import { mediaBoxPt, strokedSegmentsMm } from '../../helpers/pdf';
import { parseSvg, unmatchedSegments, type Segment } from '../../helpers/svg';

const sheet = calibrationTestSheet();
const rectSegments = ([x, y, w, h]: readonly number[]): Segment[] => [
	[[x, y], [x + w, y]],
	[[x + w, y], [x + w, y + h]],
	[[x + w, y + h], [x, y + h]],
	[[x, y + h], [x, y]],
];

describe('calibration test sheet geometry', () => {
	it('keeps every cut and fold line inside the 280 × 200 mm cutting area', () => {
		expect(fitsCutArea(sheet)).toBe(true);
	});

	it('has measuring lines of exactly 250 mm and 150 mm', () => {
		for (const { length, from, to } of Object.values(MEASURE_LINES)) {
			expect(Math.hypot(to[0] - from[0], to[1] - from[1])).toBe(length);
		}
	});

	it('keeps printed artwork clear of the cut crosses', () => {
		const crossBoxes = cutCrosses().map((p) => p.points);
		const printPoints = sheet.paths.filter((p) => p.kind === 'print').flatMap((p) => p.points);
		for (const [x, y] of printPoints) {
			for (const [[x1, y1], [x2, y2]] of crossBoxes) {
				const inside = x >= Math.min(x1, x2) - 1 && x <= Math.max(x1, x2) + 1 && y >= Math.min(y1, y2) - 1 && y <= Math.max(y1, y2) + 1;
				expect(inside, `print point ${x},${y} touches a cut cross`).toBe(false);
			}
		}
	});

	it('centres a ±0.5 mm band on each cut rectangle', () => {
		const filled = sheet.paths.filter((p): p is Path & { fill: string } => p.kind === 'print' && !!p.fill);
		for (const [x, y, w, h] of CUT_TARGETS) {
			const xs = (p: Path) => p.points.map((q) => q[0]);
			const outer = filled.find((p) => Math.min(...xs(p)) === x - BAND_HALF_WIDTH && Math.max(...xs(p)) === x + w + BAND_HALF_WIDTH);
			const inner = filled.find((p) => Math.min(...xs(p)) === x + BAND_HALF_WIDTH && Math.max(...xs(p)) === x + w - BAND_HALF_WIDTH);
			expect(outer, `outer band for ${w} × ${h}`).toBeDefined();
			expect(inner, `inner band for ${w} × ${h}`).toBeDefined();
			expect(Math.min(...inner!.points.map((q) => q[1]))).toBe(y + BAND_HALF_WIDTH);
		}
	});
});

describe('calibration test sheet exports', () => {
	it('fold SVG is 280 × 200 mm with the rectangles cut at their exact positions', () => {
		const parsed = parseSvg(foldSvg(sheet));
		expect([parsed.width, parsed.height]).toEqual(['280mm', '200mm']);
		expect(parsed.viewBox).toEqual([0, 0, 280, 200]);
		const expected = CUT_TARGETS.flatMap(rectSegments);
		expect(unmatchedSegments(parsed.segments, expected, 1e-4).missing).toEqual([]);
	});

	it('fold SVG scores the fold line as dashes along its full length', () => {
		const dashes = parseSvg(foldSvg(sheet)).segments.filter(([a, b]) => a[1] === FOLD_TARGET[0][1] && b[1] === FOLD_TARGET[0][1]);
		// 170 mm line, 1.2 mm dashes and gaps: dashes start at 1.2 + 2.4k mm while < 168.8 mm,
		// so k = 0…69. The last one (166.8–168.0 mm) fits whole, leaving a 2.0 mm end gap.
		expect(dashes).toHaveLength(70);
		const xs = dashes.flat().map((p) => p[0]);
		expect(Math.min(...xs)).toBeCloseTo(FOLD_TARGET[0][0] + 1.2, 6);
		expect(Math.max(...xs)).toBeCloseTo(FOLD_TARGET[0][0] + 168.0, 6);
	});

	it('calibration SVG is 280 × 200 mm and holds only the crosses', () => {
		const parsed = parseSvg(calibSvg());
		expect([parsed.width, parsed.height]).toEqual(['280mm', '200mm']);
		expect(parsed.segments).toHaveLength(8);
	});

	it('PDF is A4 and draws the cut rectangles and measuring lines at their mm positions', () => {
		const pdf = buildPdf(sheet, { compress: false }).output();
		const [, , w, h] = mediaBoxPt(pdf);
		expect((w * 25.4) / 72).toBeCloseTo(297, 2);
		expect((h * 25.4) / 72).toBeCloseTo(210, 2);
		const measure = Object.values(MEASURE_LINES).map(({ from, to }): Segment => [[...from], [...to]]);
		const expected = [...CUT_TARGETS.flatMap(rectSegments), ...measure];
		expect(unmatchedSegments(strokedSegmentsMm(pdf), expected, 0.005).missing).toEqual([]);
	});

	it('every sheet path produces segments', () => {
		for (const path of sheet.paths) expect(segmentsOf(path).length).toBeGreaterThan(0);
	});
});
