// Mapping CSV columns to physical shapes, ported from DataPhysicalisation.pde (normalizeCol,
// normalizeColFromZero, scaledHeight, scaledDiam, resolveColor, exportJSON). Values are
// computed in 32-bit floats like the sketch. Sizes are in mm.
import { hsb, lerpColour, pmap, toHex, type RGB } from './colour';
import { isNumericColumn, parseJavaFloat, type Table } from './csv';

const f = Math.fround;

/** Column index per dimension; −1 means not mapped. */
export interface Mapping {
	label: number;
	height: number;
	diameter: number;
	width: number;
	depth: number;
	sides: number;
	colour: number;
}

export type Mode = 'polyhedra' | 'bars';
export type BarSize = 'linked' | 'separate';

export interface Settings {
	mode: Mode;
	/** Bars: one column for width = depth ("linked"), or separate width and depth columns. */
	barSize: BarSize;
	/** Scale from zero (keeps ratios) instead of min–max with a floor. */
	trueSize: boolean;
	/** Largest height (mm). */
	scaleH: number;
	/** Smallest height as % of scaleH (relative scaling only). */
	minHeightPct: number;
	/** Largest diameter or width (mm). */
	scaleDiam: number;
	minDiamPct: number;
	/** Most sides a polyhedron can get. */
	scaleSides: number;
	/** Colour band boundaries in data units (numeric colour column). */
	thresholds: number[];
	/** How many rows to use, from the top; 0 = all. */
	visible: number;
}

export const MIN_SIDES = 3;
export const DEFAULT_SIDES = 6;

/** Processing's defaults. */
export const DEFAULT_SETTINGS: Settings = {
	mode: 'bars',
	barSize: 'linked',
	trueSize: false,
	scaleH: 100,
	minHeightPct: 20,
	scaleDiam: 20,
	minDiamPct: 20,
	scaleSides: 30,
	thresholds: [],
	visible: 0,
};

/** Default mapping after loading a CSV (updateDropdowns). */
export function defaultMapping(table: Table): Mapping {
	const numeric: number[] = [];
	let firstText = -1;
	table.columns.forEach((_, c) => {
		if (isNumericColumn(table, c)) numeric.push(c);
		else if (firstText < 0) firstText = c;
	});
	const [n1 = -1, n2 = -1, n3 = -1, n4 = -1] = numeric;
	const height = n1 >= 0 ? n1 : 0;
	return {
		label: firstText >= 0 ? firstText : 0,
		height,
		diameter: n2 >= 0 ? n2 : height,
		width: n2 >= 0 ? n2 : height,
		depth: n3 >= 0 ? n3 : height,
		sides: n4 >= 0 ? n4 : -1,
		colour: height,
	};
}

/** Parse a threshold text such as "50, 1, 100" into sorted numbers (parseThresholds). */
export function parseThresholds(text: string): number[] {
	return text
		.split(',')
		.map((t) => t.trim())
		.filter((t) => t !== '')
		.map(parseJavaFloat)
		.filter((v) => !Number.isNaN(v))
		.sort((a, b) => a - b);
}

function columnValues(table: Table, col: number): number[] {
	return table.rows.map((row) => parseJavaFloat(row[col]));
}

/** Min–max normalisation to 0–1 (normalizeCol); all values equal → all 1. */
export function normalise(values: number[]): number[] {
	let mn = 1e30;
	let mx = -1e30;
	for (const v of values) {
		if (v < mn) mn = v;
		if (v > mx) mx = v;
	}
	const range = f(mx - mn);
	if (range < 1e-9) return values.map(() => 1);
	return values.map((v) => f(f(v - mn) / range));
}

/** Normalisation from zero to the maximum (normalizeColFromZero). */
export function normaliseFromZero(values: number[]): number[] {
	let mx = -1e30;
	for (const v of values) if (v > mx) mx = v;
	if (mx < 1e-9) return values.map(() => 1);
	return values.map((v) => f(v / mx));
}

export interface Shape {
	label: string;
	/** mm */
	height: number;
	/** Polyhedra: circumscribed diameter (mm), as previewed. Bars: width = depth when linked. */
	diameter: number;
	sides: number;
	/** Bars (mm). */
	width: number;
	depth: number;
	colour: string;
	/** The row's values for the mapped columns, for labels and legends. */
	raw: { height: number; diameter: number | null; width: number | null; depth: number | null; sides: number | null; colour: string | null };
}

/** The shapes for the visible rows (the calculation in drawPolyhedra / drawBars / exportJSON). */
export function buildShapes(table: Table, map: Mapping, s: Settings): Shape[] {
	const count = s.visible > 0 ? Math.min(s.visible, table.rows.length) : table.rows.length;
	const norm = (col: number) => (col < 0 ? null : (s.trueSize ? normaliseFromZero : normalise)(columnValues(table, col)));
	const scaled = (n: number, max: number, minPct: number) =>
		s.trueSize ? f(n * f(max)) : pmap(n, 0, 1, f(f(max) * f(f(minPct) / 100)), max);
	const height = norm(map.height) ?? table.rows.map(() => 1);
	const diameter = norm(map.diameter);
	const width = norm(map.width);
	const depth = norm(map.depth);
	const sides = norm(map.sides);
	const fallbackDiam = f(f(s.scaleDiam) * 0.5);

	const numericColour = map.colour >= 0 && isNumericColumn(table, map.colour);
	const colourNorm = numericColour ? normalise(columnValues(table, map.colour)) : null;
	const colourRaw = numericColour ? columnValues(table, map.colour) : null;
	const categories = new Map<string, number>();
	if (!numericColour && map.colour >= 0) {
		for (const row of table.rows) if (!categories.has(row[map.colour])) categories.set(row[map.colour], categories.size);
	}
	const catCount = Math.max(categories.size, 1);

	const colourOf = (i: number): RGB => {
		if (colourNorm && colourRaw) {
			if (s.thresholds.length > 0) {
				let band = s.thresholds.length;
				for (let t = 0; t < s.thresholds.length; t++) {
					if (colourRaw[i] < f(s.thresholds[t])) {
						band = t;
						break;
					}
				}
				return bandColour(band, s.thresholds.length + 1);
			}
			return lerpColour([50, 80, 255], [255, 60, 50], colourNorm[i]);
		}
		if (categories.size > 0) {
			const ci = categories.get(table.rows[i][map.colour]) ?? 0;
			return hsb(pmap(ci, 0, catCount, 0, 300), 80, 90);
		}
		return [150, 180, 220];
	};

	const cell = (i: number, col: number) => (col < 0 ? null : parseJavaFloat(table.rows[i][col]));
	return Array.from({ length: count }, (_, i): Shape => {
		const diam = diameter ? scaled(diameter[i], s.scaleDiam, s.minDiamPct) : fallbackDiam;
		const linked = s.mode === 'polyhedra' || s.barSize === 'linked';
		const w = linked ? diam : width ? scaled(width[i], s.scaleDiam, s.minDiamPct) : fallbackDiam;
		const d = linked ? diam : depth ? scaled(depth[i], s.scaleDiam, s.minDiamPct) : fallbackDiam;
		const sideCount = sides ? Math.min(Math.max(Math.trunc(pmap(sides[i], 0, 1, MIN_SIDES, s.scaleSides)), MIN_SIDES), s.scaleSides) : DEFAULT_SIDES;
		return {
			label: map.label >= 0 ? table.rows[i][map.label] : `shape_${i}`,
			height: scaled(height[i], s.scaleH, s.minHeightPct),
			diameter: diam,
			sides: sideCount,
			width: w,
			depth: d,
			colour: toHex(colourOf(i)),
			raw: {
				height: parseJavaFloat(table.rows[i][map.height]),
				diameter: cell(i, map.diameter),
				width: cell(i, map.width),
				depth: cell(i, map.depth),
				sides: cell(i, map.sides),
				colour: map.colour >= 0 ? table.rows[i][map.colour] : null,
			},
		};
	});
}

/** Colour of threshold band `b` of `total` (bandColor). */
export function bandColour(b: number, total: number): RGB {
	return hsb(pmap(b, 0, total, 0, 300), 85, 90);
}

/** One entry of the JSON export. Unknown keys are ignored by PaperPolyhedra's import. */
export interface ExportEntry {
	label: string;
	height: number;
	color: string;
	sides?: number;
	diameter?: number;
	width?: number;
	depth?: number;
}

/**
 * The JSON export. Polyhedra write sides and diameter, bars width and depth, as in Processing;
 * two changes (decided with Hannah) make PaperPolyhedra build what was previewed:
 * - bars also get `sides: 4` and `diameter` = width, which PaperPolyhedra reads as the side
 *   length of a square (it ignores width/depth);
 * - 4-sided polyhedra get `diameter` = side length (diameter / √2), because PaperPolyhedra
 *   reads a 4-sided diameter as the side length, while this tool previews it corner to corner.
 */
export function exportEntries(shapes: Shape[], mode: Mode): ExportEntry[] {
	return shapes.map((shape) => {
		const base = { label: shape.label, height: shape.height, color: shape.colour };
		if (mode === 'polyhedra') {
			const diameter = shape.sides === 4 ? shape.diameter / Math.SQRT2 : shape.diameter;
			return { ...base, sides: shape.sides, diameter };
		}
		return { ...base, width: shape.width, depth: shape.depth, sides: 4, diameter: shape.width };
	});
}

/** Bars whose width and depth differ: PaperPolyhedra will make them square (width). */
export function nonSquareBars(shapes: Shape[], mode: Mode): Shape[] {
	return mode === 'bars' ? shapes.filter((s) => Math.abs(s.width - s.depth) > 1e-6) : [];
}
