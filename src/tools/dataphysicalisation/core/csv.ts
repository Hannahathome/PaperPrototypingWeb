// CSV reading as DataPhysicalisation does it (Processing loadTable(path, "header,csv")): the
// first row holds the column names; quoted fields may contain commas, quotes ("") and line
// breaks. Values are kept as text; numbers are parsed like Java's Float.parseFloat.

export interface Table {
	columns: string[];
	rows: string[][];
}

export function parseCsv(text: string): Table {
	const records: string[][] = [];
	let record: string[] = [];
	let field = '';
	let quoted = false;
	let i = 0;
	const src = text.replace(/^﻿/, '');
	const endField = () => {
		record.push(field);
		field = '';
	};
	const endRecord = () => {
		endField();
		if (!(record.length === 1 && record[0] === '')) records.push(record);
		record = [];
	};
	while (i < src.length) {
		const ch = src[i];
		if (quoted) {
			if (ch === '"') {
				if (src[i + 1] === '"') {
					field += '"';
					i += 2;
					continue;
				}
				quoted = false;
			} else field += ch;
			i++;
			continue;
		}
		if (ch === '"' && field === '') quoted = true;
		else if (ch === ',') endField();
		else if (ch === '\r' || ch === '\n') {
			endRecord();
			if (ch === '\r' && src[i + 1] === '\n') i++;
		} else field += ch;
		i++;
	}
	if (field !== '' || record.length > 0) endRecord();

	const [header = [], ...rows] = records;
	return { columns: header, rows: rows.map((r) => header.map((_, c) => r[c] ?? '')) };
}

/** Java Float.parseFloat semantics: surrounding whitespace allowed; anything else invalid → NaN. */
export function parseJavaFloat(text: string | undefined): number {
	const t = (text ?? '').trim();
	if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?[fFdD]?$/.test(t)) return Number.NaN;
	return Math.fround(Number(t.replace(/[fFdD]$/, '')));
}

/** A column is numeric when every non-empty cell parses (DataPhysicalisation isNumericCol). */
export function isNumericColumn(table: Table, col: number): boolean {
	if (col < 0 || col >= table.columns.length) return false;
	return table.rows.every((row) => row[col].trim() === '' || !Number.isNaN(parseJavaFloat(row[col])));
}
