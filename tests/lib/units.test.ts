import { describe, expect, it } from 'vitest';
import { A4_LANDSCAPE, CUT_AREA, mmToPx, pxToMm } from '../../src/lib/units';

describe('units', () => {
	it('converts one inch exactly', () => {
		expect(mmToPx(25.4, 96)).toBe(96);
		expect(mmToPx(25.4, 72)).toBe(72);
		expect(pxToMm(96, 96)).toBe(25.4);
	});

	it('round-trips', () => {
		expect(pxToMm(mmToPx(297, 72), 72)).toBeCloseTo(297, 12);
	});

	it('A4 landscape is 841.89 × 595.28 pt', () => {
		expect(mmToPx(A4_LANDSCAPE.width, 72)).toBeCloseTo(841.89, 2);
		expect(mmToPx(A4_LANDSCAPE.height, 72)).toBeCloseTo(595.28, 2);
	});

	it('the cutting area fits inside the page', () => {
		expect(CUT_AREA.width).toBeLessThan(A4_LANDSCAPE.width);
		expect(CUT_AREA.height).toBeLessThan(A4_LANDSCAPE.height);
	});
});
