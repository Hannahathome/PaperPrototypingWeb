import { describe, expect, it } from 'vitest';
import { fmt, toSvg } from '../../src/lib/svg';
import { parseSvg } from '../helpers/svg';

describe('fmt', () => {
	it('rounds to 4 decimals without trailing zeros or negative zero', () => {
		expect(fmt(1.23456789)).toBe('1.2346');
		expect(fmt(10)).toBe('10');
		expect(fmt(-0.00001)).toBe('0');
	});
});

describe('toSvg', () => {
	const svg = toSvg([{ kind: 'cut', closed: true, points: [[10, 20], [110, 20], [110, 70]] }], { width: 280, height: 200 });
	const parsed = parseSvg(svg);

	it('declares its physical size in mm with a viewBox in mm', () => {
		expect(parsed.width).toBe('280mm');
		expect(parsed.height).toBe('200mm');
		expect(parsed.viewBox).toEqual([0, 0, 280, 200]);
	});

	it('writes coordinates in mm, unchanged', () => {
		expect(parsed.segments).toEqual([
			[[10, 20], [110, 20]],
			[[110, 20], [110, 70]],
			[[110, 70], [10, 20]],
		]);
	});

	it('strokes without fill', () => {
		expect(svg).toContain('fill="none"');
		expect(svg).toContain('stroke="#000"');
	});
});
