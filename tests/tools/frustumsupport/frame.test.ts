import { describe, expect, it } from 'vitest';
import { frameGeometry } from '../../../src/tools/frustumsupport/core/frame';
import { DEFAULT_FRAME, DEFAULT_RIG } from '../../../src/tools/frustumsupport/core/params';

const input = { ...DEFAULT_FRAME, sides: 6, bottomRadius: 20, topRadius: 30, height: 40, edgeRadius: 1 };

describe('frame geometry (mirrors the OpenSCAD modules)', () => {
	const g = frameGeometry(input);

	it('insets the strut centrelines by the edge radius, as frustumCage does', () => {
		expect(Math.hypot(g.bottom[0][0], g.bottom[0][1])).toBeCloseTo(19, 12);
		expect(Math.hypot(g.top[0][0], g.top[0][1])).toBeCloseTo(29, 12);
		expect(g.top[0][2] - g.bottom[0][2]).toBeCloseTo(38, 12); // height − 2 × edge radius
		expect(g.bottom[0][2]).toBeCloseTo(-19, 12);
	});

	it('puts vertex 0 at angle 0 (OpenSCAD phase)', () => {
		expect(g.bottom[0][1]).toBeCloseTo(0, 12);
		expect(g.bottom[0][0]).toBeGreaterThan(0);
	});

	it('has a bottom ring and one wall strut per side, and one spoke per side with rigs', () => {
		expect(g.struts).toHaveLength(12);
		expect(g.spokes).toHaveLength(6);
		expect(frameGeometry({ ...input, rigsEnabled: false }).spokes).toHaveLength(0);
	});

	it('places the rig box on offset Z − 2 × edge radius above the bottom', () => {
		const [rig] = g.rigs;
		const boxBottom = rig.box.centre[2] - rig.box.size[2] / 2;
		expect(boxBottom).toBeCloseTo(-19 + DEFAULT_RIG.offsetZ - 2, 12);
		expect(rig.posts).toHaveLength(4);
		for (const [, top] of rig.posts) expect(top[2]).toBeCloseTo(boxBottom + DEFAULT_RIG.height, 12);
	});

	it('puts posts one edge radius outside the box faces, rotated with the rig', () => {
		const rotated = frameGeometry({ ...input, rigs: [{ ...DEFAULT_RIG, width: 20, depth: 10, rotation: 90 }] });
		const xs = rotated.rigs[0].posts.map(([p]) => p);
		// Unrotated +Y post (0, 5 + 1) turns to (−6, 0).
		expect(xs.some(([x, y]) => Math.abs(x + 6) < 1e-9 && Math.abs(y) < 1e-9)).toBe(true);
	});

	it('uses two posts per face with dual struts', () => {
		expect(frameGeometry({ ...input, dualStruts: true }).rigs[0].posts).toHaveLength(8);
	});
});
