// The web .scad must equal the Processing export exactly, character for character
// (line endings normalised: Processing writes the system's, CRLF on Windows).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FrameInput } from '../../../src/tools/frustumsupport/core/params';
import { templateFor } from '../../../src/tools/frustumsupport/core/params';
import { frameScad } from '../../../src/tools/frustumsupport/core/scad';

const DIR = 'tests/fixtures/frustumsupport';

interface Case {
	id: string;
	nside: number;
	bottomRadius: number;
	topRadius: number;
	height: number;
	edgeRadius: number;
	rigsEnabled: boolean;
	dualStruts: boolean;
	strutSpacing: number;
	rigs: FrameInput['rigs'];
}

const cases = readdirSync(DIR, { withFileTypes: true })
	.filter((e) => e.isDirectory())
	.map((e) => ({
		params: JSON.parse(readFileSync(join(DIR, e.name, 'params.json'), 'utf8')) as Case,
		scad: readFileSync(join(DIR, e.name, 'model.scad'), 'utf8'),
	}));

const toInput = (c: Case): FrameInput => ({ ...c, sides: c.nside });

describe('FrustumSupport .scad matches Processing exactly', () => {
	it('has fixtures', () => expect(cases.length).toBeGreaterThanOrEqual(4));

	it.each(cases.map((c) => [c.params.id, c] as const))('%s', (_, { params, scad }) => {
		expect(frameScad(toInput(params))).toBe(scad.replace(/\r\n/g, '\n'));
	});

	it('can write Windows line endings like Processing on Windows', () => {
		const { params, scad } = cases[0];
		expect(frameScad(toInput(params), { lineEnding: '\r\n' })).toBe(scad);
	});
});

describe('templateFor', () => {
	it('names a rig by its exact size, as the Processing dropdown does', () => {
		expect(templateFor({ width: 54, depth: 54, height: 17 })).toBe('M5Core_lying');
		expect(templateFor({ width: 54, depth: 54, height: 17.5 })).toBe('Custom');
	});
});
