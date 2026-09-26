// The scaffold .scad must equal ScaffoldShell's export character for character (line endings
// normalised: Processing writes the system's, CRLF on Windows).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { frameDims, presetFor } from '../../../src/tools/scaffoldshell/core/frame';
import { frameShapeSlug, scaffoldScad } from '../../../src/tools/scaffoldshell/core/scad';
import { caseInput, scaffoldCases } from './cases';

describe('ScaffoldShell .scad matches Processing exactly', () => {
	it('has fixtures', () => expect(scaffoldCases.length).toBeGreaterThanOrEqual(5));

	it.each(scaffoldCases.map((x) => [x.c.id, x] as const))('%s', (_, { c, dir }) => {
		const { shape, frame } = caseInput(c);
		const expected = readFileSync(join(dir, 'frame.scad'), 'utf8').replace(/\r\n/g, '\n');
		expect(scaffoldScad(shape, frame)).toBe(expected);
	});
});

describe('frame bridge', () => {
	it('derives circumradii from the perimeters and puts vertex 0 in a folded corner', () => {
		const d = frameDims({ sides: 6, topDiameter: 50, bottomDiameter: 50, height: 50, tabDepth: 10, flapDepth: 5, flapTaper: 5 });
		expect(d.botR).toBeCloseTo(25, 4); // hexagon: circumradius = side = diameter / 2
		expect(d.phaseDeg).toBeCloseTo(-120, 5);
	});

	it('refuses frames the clearance and struts would turn inside out', () => {
		// A 1 mm square: circumradius 0.71 mm, less than clearance + strut radius.
		const shape = { sides: 4, topDiameter: 1, bottomDiameter: 1, height: 40, tabDepth: 1, flapDepth: 1, flapTaper: 1 };
		expect(scaffoldScad(shape, { enabled: true, strutRadius: 1, clearance: 0.4, dualStruts: false, strutSpacing: 15, flapLength: 8, rigs: [] })).toBeNull();
	});

	it('names rigs by preset and files by label', () => {
		expect(presetFor({ width: 24, depth: 31.5, height: 24 })).toBe('M5Atom lying');
		expect(frameShapeSlug(' Blue whale! ', 0)).toBe('Blue_whale');
		expect(frameShapeSlug('', 2)).toBe('shape3');
	});
});
