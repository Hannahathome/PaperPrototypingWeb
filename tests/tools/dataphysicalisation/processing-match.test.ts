// Layer 2: the web mapping against real DataPhysicalisation exports
// (tests/fixtures/dataphysicalisation). Sizes must match within 0.001 mm and colours exactly.
// The export adds keys (see exportEntries), so only Processing's keys are compared.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCsv } from '../../../src/tools/dataphysicalisation/core/csv';
import { buildShapes, defaultMapping, exportEntries, parseThresholds, type Mapping, type Settings } from '../../../src/tools/dataphysicalisation/core/mapping';

const DIR = 'tests/fixtures/dataphysicalisation';

interface Case {
	id: string;
	csv: string;
	mapping: Partial<Record<'label' | 'height' | 'diameter' | 'width' | 'depth' | 'sides' | 'color', string | null>>;
	mode: 'polyhedra' | 'bars';
	barSize: 'linked' | 'separate';
	trueSize: boolean;
	scaleH: number;
	minHeightPct: number;
	scaleDiam: number;
	minDiamPct: number;
	scaleSides: number;
	thresholds: string;
	visible: number;
}

const cases = readdirSync(DIR, { withFileTypes: true })
	.filter((e) => e.isDirectory())
	.map((e) => ({
		c: JSON.parse(readFileSync(join(DIR, e.name, 'case.json'), 'utf8')) as Case,
		expected: JSON.parse(readFileSync(join(DIR, e.name, 'export.json'), 'utf8')) as Record<string, number | string>[],
	}));

function run(c: Case) {
	const table = parseCsv(readFileSync(join(DIR, c.csv), 'utf8'));
	const map: Mapping = defaultMapping(table);
	const index = (name: string | null) => (name === null ? -1 : table.columns.indexOf(name));
	const keys: [keyof Case['mapping'], keyof Mapping][] = [
		['label', 'label'],
		['height', 'height'],
		['diameter', 'diameter'],
		['width', 'width'],
		['depth', 'depth'],
		['sides', 'sides'],
		['color', 'colour'],
	];
	for (const [from, to] of keys) if (from in c.mapping) map[to] = index(c.mapping[from] ?? null);
	const settings: Settings = { ...c, thresholds: parseThresholds(c.thresholds) };
	return exportEntries(buildShapes(table, map, settings), c.mode);
}

describe('DataPhysicalisation export matches Processing', () => {
	it('has fixtures', () => expect(cases.length).toBeGreaterThanOrEqual(5));

	it.each(cases.map((x) => [x.c.id, x] as const))('%s', (_, { c, expected }) => {
		const actual = run(c);
		expect(actual).toHaveLength(expected.length);
		expected.forEach((exp, i) => {
			const act = actual[i] as unknown as Record<string, number | string>;
			for (const [key, value] of Object.entries(exp)) {
				if (typeof value === 'number') {
					// 4-sided polyhedra: the web export writes the side length on purpose.
					const want = key === 'diameter' && c.mode === 'polyhedra' && exp.sides === 4 ? value / Math.SQRT2 : value;
					expect(act[key], `${c.id} #${i} ${key}`).toBeCloseTo(want, 3);
				} else {
					expect(act[key], `${c.id} #${i} ${key}`).toBe(value);
				}
			}
		});
	});
});
