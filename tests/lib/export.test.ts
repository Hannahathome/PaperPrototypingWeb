import { describe, expect, it } from 'vitest';
import { buildExportFiles, exportFileNames, exportStamp, fitsCutArea, foldSvg, sanitiseName } from '../../src/lib/export';
import { parseSvg } from '../helpers/svg';

const date = new Date(2026, 8, 25, 14, 5, 9);

describe('export names', () => {
	it('stamps M_D_H_MM_SS', () => {
		expect(exportStamp(date)).toBe('9_25_14_05_09');
		expect(exportStamp(new Date(2026, 11, 31, 9, 30, 50))).toBe('12_31_9_30_50');
	});

	it('names the three files by the convention', () => {
		expect(exportFileNames('hexagon', date)).toEqual({
			pdf: 'hexagon_9_25_14_05_09.pdf',
			fold: 'hexagon_fold_9_25_14_05_09.svg',
			calib: 'hexagon_calib_9_25_14_05_09.svg',
		});
	});

	it('sanitises names', () => {
		expect(sanitiseName('  my/shape: v2  ')).toBe('my-shape- v2');
		expect(sanitiseName('   ')).toBe('result');
	});
});

describe('fitsCutArea', () => {
	it('checks cut and fold lines against 280 × 200 mm, ignoring print', () => {
		expect(fitsCutArea({ paths: [{ kind: 'cut', points: [[0, 0], [280, 200]] }] })).toBe(true);
		expect(fitsCutArea({ paths: [{ kind: 'fold', points: [[0, 0], [280.01, 10]] }] })).toBe(false);
		expect(fitsCutArea({ paths: [{ kind: 'print', points: [[0, 0], [297, 210]] }] })).toBe(true);
	});
});

describe('foldSvg', () => {
	it('is 280 × 200 mm and contains no print paths', () => {
		const parsed = parseSvg(
			foldSvg({
				paths: [
					{ kind: 'cut', points: [[10, 10], [20, 10]] },
					{ kind: 'print', points: [[10, 50], [20, 50]] },
				],
			}),
		);
		expect([parsed.width, parsed.height]).toEqual(['280mm', '200mm']);
		expect(parsed.segments).toEqual([[[10, 10], [20, 10]]]);
	});
});

describe('buildExportFiles', () => {
	it('produces the PDF, fold SVG and calibration SVG in that order', () => {
		const files = buildExportFiles({ paths: [] }, 'test', date);
		expect(files.map((f) => f.name)).toEqual(['test_9_25_14_05_09.pdf', 'test_fold_9_25_14_05_09.svg', 'test_calib_9_25_14_05_09.svg']);
		expect(files.map((f) => f.blob.type)).toEqual(['application/pdf', 'image/svg+xml', 'image/svg+xml']);
	});
});
