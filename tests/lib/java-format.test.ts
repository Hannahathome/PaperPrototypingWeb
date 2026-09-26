import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { javaFloatString, javaFormatFixed, javaIntString } from '../../src/lib/java-format';

// Expected values are what Java prints for `"" + (float) x`.
describe('javaFloatString', () => {
	it.each([
		[8, '8.0'],
		[0, '0.0'],
		[-0, '-0.0'],
		[31.5, '31.5'],
		[-3.5, '-3.5'],
		[20.3, '20.3'],
		[0.1, '0.1'],
		[0.003, '0.003'],
		[0.001, '0.001'],
		[1234.5, '1234.5'],
		[9999999, '9999999.0'],
		[1e7, '1.0E7'],
		[12345678, '1.2345678E7'],
		[0.0001, '1.0E-4'],
		[0.00025, '2.5E-4'],
		[-0.0005, '-5.0E-4'],
		[100, '100.0'],
		[33.3, '33.3'],
		[1 / 3, '0.33333334'],
	])('%s → %s', (value, expected) => {
		expect(javaFloatString(value)).toBe(expected);
	});

	it('rounds to 32-bit float first', () => {
		// 0.1 + 0.2 in double is 0.30000000000000004, which is the float 0.3.
		expect(javaFloatString(0.1 + 0.2)).toBe('0.3');
	});
});

describe('javaIntString', () => {
	it('truncates like an int cast', () => {
		expect(javaIntString(8)).toBe('8');
		expect(javaIntString(6.9)).toBe('6');
	});
});

describe('javaFloatString against Java 17 (Processing 4.3 runtime)', () => {
	it('matches 5000 values formatted by Java', () => {
		const rows = readFileSync('tests/fixtures/java-format/float-strings.tsv', 'utf8').trim().split('\n');
		const view = new DataView(new ArrayBuffer(4));
		const mismatches = rows.flatMap((row) => {
			const [bits, expected] = row.split('\t');
			view.setInt32(0, Number(bits));
			const actual = javaFloatString(view.getFloat32(0));
			return actual === expected ? [] : [`${expected} → ${actual}`];
		});
		expect(rows).toHaveLength(5000);
		expect(mismatches.slice(0, 10)).toEqual([]);
	});
});

describe('javaFormatFixed against Java 17 String.format("%.4f")', () => {
	it('matches 5016 values formatted by Java, including negative zero and exact ties', () => {
		const rows = readFileSync('tests/fixtures/java-format/fixed-4.tsv', 'utf8').trim().split('\n');
		const view = new DataView(new ArrayBuffer(4));
		const mismatches = rows.flatMap((row) => {
			const [bits, expected] = row.split('\t');
			view.setInt32(0, Number(bits));
			const actual = javaFormatFixed(view.getFloat32(0), 4);
			return actual === expected ? [] : [`${expected} → ${actual}`];
		});
		expect(rows.length).toBeGreaterThan(5000);
		expect(mismatches.slice(0, 10)).toEqual([]);
	});
});
