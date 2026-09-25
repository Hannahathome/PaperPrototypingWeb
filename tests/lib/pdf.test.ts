import { describe, expect, it } from 'vitest';
import { printCrosses } from '../../src/lib/calibration';
import { segmentsOf, type Sheet } from '../../src/lib/drawing';
import { buildPdf } from '../../src/lib/pdf';
import { mediaBoxPt, strokedSegmentsMm } from '../helpers/pdf';
import { unmatchedSegments, type Segment } from '../helpers/svg';

// jsPDF writes coordinates to 0.01 pt ≈ 0.0035 mm.
const PDF_TOLERANCE_MM = 0.005;

const sheet: Sheet = {
	paths: [{ kind: 'cut', closed: true, points: [[50, 50], [150, 50], [150, 100], [50, 100]] }],
};
const pdf = buildPdf(sheet, { compress: false }).output();

describe('buildPdf', () => {
	it('is exactly A4 landscape (297 × 210 mm)', () => {
		const [x0, y0, x1, y1] = mediaBoxPt(pdf);
		expect([x0, y0]).toEqual([0, 0]);
		expect((x1 * 25.4) / 72).toBeCloseTo(297, 2);
		expect((y1 * 25.4) / 72).toBeCloseTo(210, 2);
	});

	it('draws cut lines at their mm positions', () => {
		const expected = segmentsOf(sheet.paths[0]) as Segment[];
		const { missing } = unmatchedSegments(strokedSegmentsMm(pdf), expected, PDF_TOLERANCE_MM);
		expect(missing).toEqual([]);
	});

	it('draws the calibration crosses', () => {
		const expected = printCrosses().flatMap(segmentsOf) as Segment[];
		const { missing } = unmatchedSegments(strokedSegmentsMm(pdf), expected, PDF_TOLERANCE_MM);
		expect(missing).toEqual([]);
	});

	it('dashes fold lines on the print as on the cutter', () => {
		const foldPdf = buildPdf({ paths: [{ kind: 'fold', points: [[20, 20], [30, 20]] }] }, { compress: false }).output();
		const onFoldLine = strokedSegmentsMm(foldPdf).filter(([a]) => Math.abs(a[1] - 20) < PDF_TOLERANCE_MM);
		expect(onFoldLine).toHaveLength(4);
	});
});
