// The DataPhysicalisation → PaperPolyhedra handoff: the export must build, in PaperPolyhedra,
// the shapes that were previewed; and existing example files must still import.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isNumericColumn, parseCsv, parseJavaFloat } from '../../../src/tools/dataphysicalisation/core/csv';
import { buildShapes, DEFAULT_SETTINGS, defaultMapping, exportEntries, nonSquareBars } from '../../../src/tools/dataphysicalisation/core/mapping';
import { importShapes, parseHexColour } from '../../../src/tools/paperpolyhedra/core/import';
import { circumradius, shapeDims } from '../../../src/tools/paperpolyhedra/core/params';

const tabs = { tabDepth: 10, flapDepth: 5, flapTaper: 5 };
const table = parseCsv(readFileSync('tests/fixtures/dataphysicalisation/animals.csv', 'utf8'));

describe('CSV reading', () => {
	it('keeps quoted commas and reads the header', () => {
		expect(table.columns).toEqual(['name', 'speed_kmh', 'weight_kg', 'lifespan_years', 'legs', 'class']);
		expect(table.rows[2][0]).toBe('Sailfish, Atlantic');
		expect(table.rows).toHaveLength(8);
	});

	it('handles quotes, CRLF, a BOM and a missing trailing newline', () => {
		const t = parseCsv('﻿a,b\r\n"say ""hi""",2\r\n"two\nlines",3');
		expect(t.columns).toEqual(['a', 'b']);
		expect(t.rows).toEqual([
			['say "hi"', '2'],
			['two\nlines', '3'],
		]);
	});

	it('parses numbers like Java', () => {
		expect(parseJavaFloat(' 12.5 ')).toBe(12.5);
		expect(parseJavaFloat('1e3')).toBe(1000);
		expect(parseJavaFloat('')).toBeNaN();
		expect(parseJavaFloat('12,5')).toBeNaN();
		expect(isNumericColumn(table, 1)).toBe(true);
		expect(isNumericColumn(table, 5)).toBe(false);
	});

	it('picks the default columns like Processing', () => {
		expect(defaultMapping(table)).toEqual({ label: 0, height: 1, diameter: 2, width: 2, depth: 3, sides: 4, colour: 1 });
	});
});

describe('export → PaperPolyhedra import', () => {
	const map = defaultMapping(table);

	it('bars import as squares of the previewed width', () => {
		const shapes = buildShapes(table, map, { ...DEFAULT_SETTINGS, mode: 'bars', barSize: 'linked' });
		const imported = importShapes(JSON.stringify(exportEntries(shapes, 'bars')), tabs).shapes;
		imported.forEach((s, i) => {
			const d = shapeDims(s.input);
			expect(d.sides).toBe(4);
			expect(d.topSide).toBeCloseTo(shapes[i].width, 9);
			expect(d.height).toBeCloseTo(shapes[i].height, 9);
			expect(s.fill).toBe(shapes[i].colour);
			expect(s.label).toBe(shapes[i].label);
		});
	});

	it('polyhedra import with the previewed corner-to-corner size, 4 sides included', () => {
		const shapes = buildShapes(table, { ...map, sides: -1 }, { ...DEFAULT_SETTINGS, mode: 'polyhedra' }).map((s, i) => ({ ...s, sides: [3, 4, 5, 6, 8][i % 5] }));
		const imported = importShapes(JSON.stringify(exportEntries(shapes, 'polyhedra')), tabs).shapes;
		imported.forEach((s, i) => {
			const d = shapeDims(s.input);
			expect(d.sides).toBe(shapes[i].sides);
			// The paper polygon's corner-to-corner size equals the preview's diameter.
			expect(2 * circumradius(d.sides, d.topSide)).toBeCloseTo(shapes[i].diameter, 9);
		});
	});

	it('flags bars with different width and depth, which PaperPolyhedra makes square', () => {
		const shapes = buildShapes(table, map, { ...DEFAULT_SETTINGS, mode: 'bars', barSize: 'separate' });
		expect(nonSquareBars(shapes, 'bars').length).toBeGreaterThan(0);
		expect(nonSquareBars(shapes, 'polyhedra')).toEqual([]);
	});
});

describe('PaperPolyhedra import', () => {
	it('uses Processing’s defaults for missing fields and ignores unknown keys', () => {
		const [s] = importShapes('[{"width": 12, "depth": 12}]', tabs).shapes;
		expect(s.input).toMatchObject({ sides: 4, topDiameter: 30, bottomDiameter: 30, height: 30 });
		expect(s.label).toBe('');
		expect(s.fill).toBeNull();
	});

	it('takes only tab and flap settings from the current shape, never its size', () => {
		const current = { sides: 6, topDiameter: 50, bottomDiameter: 50, height: 50, tabDepth: 7, flapDepth: 4, flapTaper: 3 };
		const [s] = importShapes('[{"sides": 5, "diameter": 12, "height": 20}]', current).shapes;
		expect(s.input).toEqual({ sides: 5, topDiameter: 12, bottomDiameter: 12, height: 20, tabDepth: 7, flapDepth: 4, flapTaper: 3 });
	});

	it('reads colours like parseHexColor (white when invalid)', () => {
		expect(parseHexColour('#b4e522')).toBe('#B4E522');
		expect(parseHexColour('B4E522')).toBe('#B4E522');
		expect(parseHexColour('red')).toBe('#FFFFFF');
	});

	it('rejects files that are not a JSON array', () => {
		expect(() => importShapes('{"a": 1}', tabs)).toThrow();
		expect(() => importShapes('not json', tabs)).toThrow();
		expect(importShapes('[1, {"sides": 5}]', tabs).skipped).toHaveLength(1);
	});

	const examples = readdirSync('tests/fixtures/dataphysicalisation-examples').filter((f) => f.endsWith('.json'));
	it.each(examples)('imports the example %s as Processing would', (file) => {
		const text = readFileSync(join('tests/fixtures/dataphysicalisation-examples', file), 'utf8');
		const raw = JSON.parse(text) as Record<string, unknown>[];
		const { shapes, skipped } = importShapes(text, tabs);
		expect(skipped).toEqual([]);
		expect(shapes).toHaveLength(raw.length);
		shapes.forEach((s, i) => {
			// These files are bar exports (width/depth only), so Processing builds 30 mm squares.
			expect(s.input.sides).toBe(typeof raw[i].sides === 'number' ? raw[i].sides : 4);
			expect(s.input.topDiameter).toBe(typeof raw[i].diameter === 'number' ? raw[i].diameter : 30);
			expect(s.input.height).toBeCloseTo(Math.max(1, raw[i].height as number), 9);
		});
	});
});
