// The calibration test sheet: checks that the printer prints at actual size and that the
// cutter lands on the print. Everything is in mm inside the 280 × 200 mm cutting area.
import type { Label, Path, Point, Sheet } from '../../../lib/drawing';

/** Half the width of the printed tolerance band around each cut line. */
export const BAND_HALF_WIDTH = 0.5;
export const BAND_COLOUR = '#d0d0d0';

/** Printed measuring lines: nominal length and end points. */
export const MEASURE_LINES = {
	horizontal: { length: 250, from: [15, 32] as Point, to: [265, 32] as Point },
	vertical: { length: 150, from: [30, 42] as Point, to: [30, 192] as Point },
} as const;

/** Rectangles the cutter cuts, as [x, y, width, height] in mm. */
export const CUT_TARGETS = [
	[50, 50, 50, 50],
	[120, 50, 100, 50],
] as const;

/** A line the cutter scores (dashed), from, to. */
export const FOLD_TARGET: [Point, Point] = [
	[50, 125],
	[220, 125],
];

const TICK = 3;

function rect(x: number, y: number, w: number, h: number): Point[] {
	return [
		[x, y],
		[x + w, y],
		[x + w, y + h],
		[x, y + h],
	];
}

function measureLine(from: Point, to: Point): Path[] {
	const horizontal = from[1] === to[1];
	const tick = (p: Point): Path => ({
		kind: 'print',
		points: horizontal
			? [
					[p[0], p[1] - TICK],
					[p[0], p[1] + TICK],
				]
			: [
					[p[0] - TICK, p[1]],
					[p[0] + TICK, p[1]],
				],
	});
	return [{ kind: 'print', points: [from, to] }, tick(from), tick(to)];
}

/** A grey band ±BAND_HALF_WIDTH around a rectangle's outline: grey outer fill, white inner fill. */
function band(x: number, y: number, w: number, h: number): Path[] {
	const b = BAND_HALF_WIDTH;
	return [
		{ kind: 'print', closed: true, fill: BAND_COLOUR, points: rect(x - b, y - b, w + 2 * b, h + 2 * b) },
		{ kind: 'print', closed: true, fill: '#ffffff', points: rect(x + b, y + b, w - 2 * b, h - 2 * b) },
	];
}

export function calibrationTestSheet(): Sheet {
	const paths: Path[] = [
		...measureLine(MEASURE_LINES.horizontal.from, MEASURE_LINES.horizontal.to),
		...measureLine(MEASURE_LINES.vertical.from, MEASURE_LINES.vertical.to),
		...CUT_TARGETS.flatMap(([x, y, w, h]) => band(x, y, w, h)),
		...CUT_TARGETS.map(([x, y, w, h]): Path => ({ kind: 'cut', closed: true, points: rect(x, y, w, h) })),
		{ kind: 'fold', points: [...FOLD_TARGET] },
	];

	const labels: Label[] = [
		{ text: 'Calibration test sheet. Print at Actual size (100 %), never Fit to page.', at: [30, 18], size: 4 },
		{ text: '250 mm', at: [132, 29], size: 3 },
		{ text: '150 mm', at: [34, 118], size: 3 },
		{ text: 'Cut: 50 × 50 mm', at: [50, 107], size: 3 },
		{ text: 'Cut: 100 × 50 mm', at: [120, 107], size: 3 },
		{ text: 'Fold: 170 mm, scored as dashes, not cut through', at: [50, 132], size: 3 },
		{ text: '1. Measure the two lines with a ruler: 250 mm and 150 mm, within 0.5 mm.', at: [50, 150], size: 3 },
		{ text: '2. Cut the _calib_ file first: the cut crosses must run through the printed crosses.', at: [50, 157], size: 3 },
		{ text: '3. Cut the _fold_ file: every cut should stay inside the grey bands (±0.5 mm).', at: [50, 164], size: 3 },
	];

	return { paths, labels };
}
