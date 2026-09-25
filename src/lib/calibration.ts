// Registration crosses shared by the print and the cutter, matching Processing's
// drawCalibCrosses() (print) and drawCalibCrosses_V() (cut) in PrintNCut.pde.
import type { Path, Point } from './drawing';
import { CUT_AREA } from './units';

/** Cross centres: 10 mm in from each corner of the 280 × 200 mm cutting area. */
export const CROSS_CENTRES: readonly Point[] = [
	[10, 10],
	[CUT_AREA.width - 10, 10],
	[10, CUT_AREA.height - 10],
	[CUT_AREA.width - 10, CUT_AREA.height - 10],
];

/** Half the arm length of the printed crosses (4 mm across). */
export const PRINT_CROSS_HALF = 2;
/** Half the arm length of the cut crosses (20 mm across). */
export const CUT_CROSS_HALF = 10;

function crosses(half: number, kind: Path['kind']): Path[] {
	return CROSS_CENTRES.flatMap(([x, y]): Path[] => [
		{ kind, points: [[x, y - half], [x, y + half]] },
		{ kind, points: [[x - half, y], [x + half, y]] },
	]);
}

/** The small crosses printed on the PDF. */
export function printCrosses(): Path[] {
	return crosses(PRINT_CROSS_HALF, 'print');
}

/** The crosses in the calibration SVG, cut first to check registration. */
export function cutCrosses(): Path[] {
	return crosses(CUT_CROSS_HALF, 'cut');
}
