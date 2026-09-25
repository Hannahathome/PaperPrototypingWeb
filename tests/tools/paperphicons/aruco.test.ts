import { describe, expect, it } from 'vitest';
import { ARUCO_ORIGINAL_SIZE, arucoOriginalBits } from '../../../src/tools/paperphicons/core/aruco';
import { readPng } from '../../helpers/png';

describe('ArUco original dictionary', () => {
	const sheet = readPng('tests/fixtures/paperphicons/aruco1024_px.png');

	it('matches every marker in PaperPhicons’ aruco1024_px.png, cell for cell', () => {
		expect([sheet.width, sheet.height]).toEqual([256, 256]);
		const white = (x: number, y: number) => (sheet.rgb(x, y).every((v) => v === 255) ? 1 : 0);
		const mismatches: number[] = [];
		for (let id = 0; id < ARUCO_ORIGINAL_SIZE; id++) {
			// PaperPhicons initMarkers(): marker index = column + row × 32, cells at x, y = 1…5.
			const [ox, oy] = [(id % 32) * 8, Math.floor(id / 32) * 8];
			const bits = arucoOriginalBits(id);
			const same = bits.every((row, r) => row.every((bit, c) => bit === white(ox + 1 + c, oy + 1 + r)));
			// The border around the data must be black, the spacer white.
			const border = [0, 6].every((k) => Array.from({ length: 7 }, (_, j) => white(ox + k, oy + j) === 0 && white(ox + j, oy + k) === 0).every(Boolean));
			if (!same || !border) mismatches.push(id);
		}
		expect(mismatches).toEqual([]);
	});

	it('rejects ids outside the dictionary', () => {
		expect(() => arucoOriginalBits(1024)).toThrow(RangeError);
		expect(() => arucoOriginalBits(-1)).toThrow(RangeError);
	});
});
