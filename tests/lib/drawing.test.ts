import { describe, expect, it } from 'vitest';
import { boundsOf, dashSegments, segmentsOf, toCutterPaths, type Path } from '../../src/lib/drawing';

describe('dashSegments (port of Processing drawDashedLine)', () => {
	it('starts after a gap and shortens the last dash so it stops one gap before the end', () => {
		const dashes = dashSegments([0, 0], [10, 0], 1.2, 1.2);
		const starts = dashes.map(([a]) => a[0]);
		const ends = dashes.map(([, b]) => b[0]);
		[1.2, 3.6, 6.0, 8.4].forEach((v, i) => expect(starts[i]).toBeCloseTo(v, 10));
		[2.4, 4.8, 7.2, 8.8].forEach((v, i) => expect(ends[i]).toBeCloseTo(v, 10));
		expect(dashes).toHaveLength(4);
	});

	it('draws nothing when the line is no longer than two gaps', () => {
		expect(dashSegments([0, 0], [2.4, 0], 1.2, 1.2)).toEqual([]);
		expect(dashSegments([0, 0], [0, 0], 1.2, 1.2)).toEqual([]);
	});

	it('draws one short dash just above two gaps', () => {
		const dashes = dashSegments([0, 0], [2.5, 0], 1.2, 1.2);
		expect(dashes).toHaveLength(1);
		expect(dashes[0][1][0] - dashes[0][0][0]).toBeCloseTo(0.1, 10);
	});

	it('follows the line direction', () => {
		const dashes = dashSegments([10, 10], [40, 50], 1.2, 1.2);
		for (const [a, b] of dashes) {
			expect((b[1] - a[1]) / (b[0] - a[0])).toBeCloseTo(40 / 30, 10);
		}
		expect(dashes[0][0][0]).toBeCloseTo(10 + 1.2 * 0.6, 10);
	});
});

describe('segmentsOf', () => {
	it('closes closed paths', () => {
		const square: Path = { kind: 'cut', closed: true, points: [[0, 0], [1, 0], [1, 1], [0, 1]] };
		expect(segmentsOf(square)).toHaveLength(4);
		expect(segmentsOf({ ...square, closed: false })).toHaveLength(3);
	});
});

describe('toCutterPaths', () => {
	it('keeps cut paths, dashes fold paths per segment and drops print paths', () => {
		const paths: Path[] = [
			{ kind: 'cut', points: [[0, 0], [50, 0]] },
			{ kind: 'fold', points: [[0, 10], [10, 10], [10, 20]] },
			{ kind: 'print', points: [[0, 30], [50, 30]] },
		];
		const cutter = toCutterPaths(paths);
		expect(cutter.filter((p) => p.kind === 'cut')).toEqual([paths[0]]);
		expect(cutter.filter((p) => p.kind === 'fold')).toHaveLength(8);
		expect(cutter.some((p) => p.kind === 'print')).toBe(false);
	});
});

describe('boundsOf', () => {
	it('covers all points', () => {
		expect(boundsOf([{ kind: 'cut', points: [[1, 2], [-3, 8]] }])).toEqual({ minX: -3, minY: 2, maxX: 1, maxY: 8 });
		expect(boundsOf([])).toBeNull();
	});
});
