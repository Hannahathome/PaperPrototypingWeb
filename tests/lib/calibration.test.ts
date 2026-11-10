import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cutCrosses, printCrosses } from '../../src/lib/calibration';
import { segmentsOf, type Path } from '../../src/lib/drawing';
import { calibSvg } from '../../src/lib/export';
import { PROCESSING_MM_V } from '../helpers/processing';
import { parseSvg, segmentsInMm, unmatchedSegments, type Segment } from '../helpers/svg';

const TOLERANCE_MM = 0.1;
const segments = (paths: Path[]) => paths.flatMap(segmentsOf) as Segment[];

describe('calibration crosses', () => {
	it('match the Processing calibration export within 0.1 mm', () => {
		const reference = parseSvg(readFileSync('tests/fixtures/calibration/processing_calib.svg', 'utf8'));
		// Processing draws at MM_V px/mm and declares 280 × 200 mm; read it at its intended scale.
		const expected = segmentsInMm(reference.segments, PROCESSING_MM_V);
		expect(expected).toHaveLength(8);
		expect(unmatchedSegments(segments(cutCrosses()), expected, TOLERANCE_MM)).toEqual({ missing: [], extra: [] });
	});

	it('the web calibration SVG contains exactly those crosses, in mm', () => {
		const parsed = parseSvg(calibSvg());
		expect(parsed.width).toBe('280mm');
		expect(parsed.height).toBe('200mm');
		expect(parsed.viewBox).toEqual([0, 0, 280, 200]);
		expect(unmatchedSegments(parsed.segments, segments(cutCrosses()), 1e-4)).toEqual({ missing: [], extra: [] });
	});

	it('print and cut crosses share their centres', () => {
		const centre = ([a, b]: Segment) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
		expect(segments(printCrosses()).map(centre)).toEqual(segments(cutCrosses()).map(centre));
	});

	it('print crosses are 4 mm across, cut crosses 20 mm', () => {
		const lengths = (s: Segment[]) => new Set(s.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1])));
		expect(lengths(segments(printCrosses()))).toEqual(new Set([4]));
		expect(lengths(segments(cutCrosses()))).toEqual(new Set([20]));
	});
});
