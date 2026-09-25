// PaperPhicons: a cuboid block net with an ArUco marker, ported from PaperPhicons.pde
// (set2DPlanParams, drawPatternA_FrontFold / BackFold / FrontCut, drawMarker). Millimetres,
// origin top-left of the page, y down.
//
// The net is a tray (base W × L, walls H, diagonal corner gussets) with a lid hinged on the
// right wall, whose flaps and glue flap are inset by the paper thickness. Placement follows the
// shared print-and-cut convention (decided with Hannah): PaperPhicons' own 5 mm shift of the
// cut files, 10 mm crosses and unit-less SVGs are not reproduced; the net itself is.
import type { Label, Path, Point, Sheet } from '../../../lib/drawing';
import { fitsCutArea } from '../../../lib/export';
import { ARUCO_ORIGINAL_SIZE, arucoOriginalBits } from './aruco';

export interface BlockInput {
	/** Block width (mm): the marker face is width × length. */
	width: number;
	length: number;
	height: number;
	/** ArUco original id of the first block's marker; copy i gets firstMarkerId + i. */
	firstMarkerId: number;
	/** Side of the marker's black square (mm); the white margin adds one cell on each side. */
	markerSize: number;
	/** Number of blocks on the sheet. */
	copies: number;
	/** Put the marker on the H × L wall instead of the W × L base (Processing "M_Pos"). */
	markerOnSide: boolean;
}

/** Processing's defaults (PaperPhicons.pde, UI.pde). */
export const DEFAULT_BLOCK: BlockInput = {
	width: 50,
	length: 50,
	height: 20,
	firstMarkerId: 48,
	markerSize: 16,
	copies: 1,
	markerOnSide: false,
};

/** Paper thickness allowance for the lid and its flaps (thickMM). */
export const THICKNESS = 0.5;
/** Flap taper (offsetMM). */
export const FLAP_OFFSET = 3;
/** PaperPhicons draws folds with 3 mm dashes and 3 mm gaps. */
export const DASH: readonly [number, number] = [3, 3];
/** Pattern origin on the page (patX, patY). */
export const ORIGIN: Point = [15, 15];
/** Print colours: front folds and cuts red, back (diagonal) folds blue. */
export const FRONT_COLOUR = '#ff0000';
export const BACK_COLOUR = '#0000ff';

/** Column and row edges of the net (xpos, ypos for one unit). */
export function gridLines({ width: W, length: L, height: H }: Pick<BlockInput, 'width' | 'length' | 'height'>): { x: number[]; y: number[] } {
	return { x: [0, H, H + W, 2 * H + W, 2 * H + 2 * W, 3 * H + 2 * W], y: [0, H, H + L, 2 * H + L] };
}

/**
 * The net of one block with its top-left at `at`. `foldThickness` exists only to reproduce
 * Processing's cut file in tests: there the fold lines use 0.375 mm (see hidden-behaviour.md).
 */
export function blockPaths(input: BlockInput, at: Point, { foldThickness = THICKNESS }: { foldThickness?: number } = {}): Path[] {
	const { x, y } = gridLines(input);
	const t = THICKNESS;
	const ft = foldThickness;
	const off = FLAP_OFFSET;
	const p = (px: number, py: number): Point => [at[0] + px, at[1] + py];
	const front = (a: Point, b: Point): Path => ({ kind: 'fold', points: [a, b], colour: FRONT_COLOUR, dash: DASH });
	const back = (a: Point, b: Point): Path => ({ kind: 'fold', points: [a, b], colour: BACK_COLOUR, dash: DASH });
	const cut = (a: Point, b: Point): Path => ({ kind: 'cut', points: [a, b], colour: FRONT_COLOUR });

	return [
		// drawPatternA_BackFold: the corner gusset diagonals.
		back(p(x[0], y[0]), p(x[1], y[1])),
		back(p(x[3], y[0]), p(x[2], y[1])),
		back(p(x[0], y[3]), p(x[1], y[2])),
		back(p(x[3], y[3]), p(x[2], y[2])),
		// drawPatternA_FrontFold.
		front(p(x[1], y[0]), p(x[1], y[3])),
		front(p(x[2], y[0]), p(x[2], y[3])),
		front(p(x[3], y[1]), p(x[3], y[2])),
		front(p(x[4] - ft, y[1] + ft), p(x[4] - ft, y[2] - ft)),
		front(p(x[0], y[1]), p(x[3], y[1])),
		front(p(x[3], y[1] + ft), p(x[4] - ft, y[1] + ft)),
		front(p(x[0], y[2]), p(x[3], y[2])),
		front(p(x[3], y[2] - ft), p(x[4] - ft, y[2] - ft)),
		// drawPatternA_FrontCut.
		cut(p(x[0], y[0]), p(x[0], y[3])),
		cut(p(x[5] - 2 * t, y[1] + off + t), p(x[5] - 2 * t, y[2] - off - t)),
		cut(p(x[0], y[0]), p(x[3], y[0])),
		cut(p(x[3] + off, y[0] + t), p(x[4] - off - t, y[0] + t)),
		cut(p(x[0], y[3]), p(x[3], y[3])),
		cut(p(x[3] + off, y[3] - t), p(x[4] - off - t, y[3] - t)),
		cut(p(x[3], y[0]), p(x[3], y[1] + t)),
		cut(p(x[3], y[2] - t), p(x[3], y[3])),
		cut(p(x[4] - off - t, y[0] + t), p(x[4] - t, y[1] + t)),
		cut(p(x[4] - off - t, y[3] - t), p(x[4] - t, y[2] - t)),
		cut(p(x[4] - t, y[1] + t), p(x[5] - 2 * t, y[1] + off + t)),
		cut(p(x[4] - t, y[2] - t), p(x[5] - 2 * t, y[2] - off - t)),
		cut(p(x[3] + off, y[0] + t), p(x[3], y[1] + t)),
		cut(p(x[3] + off, y[3] - t), p(x[3], y[2] - t)),
	];
}

/** Centre of the marker face: the base (W × L) or, with `markerOnSide`, the right wall (H × L). */
export function markerCentre(input: BlockInput, at: Point): Point {
	const { x, y } = gridLines(input);
	const cx = input.markerOnSide ? (x[3] + x[2]) / 2 : (x[1] + x[2]) / 2;
	return [at[0] + cx, at[1] + (y[1] + y[2]) / 2];
}

/**
 * A marker as filled print paths: a black square of `size` with white data cells, centred on
 * `centre`, plus a white margin of one cell (size / 7) around it on the paper. Cells are exact;
 * Processing rounds them to whole points.
 */
export function markerPaths(id: number, size: number, centre: Point): Path[] {
	const cell = size / 7;
	const [left, top] = [centre[0] - size / 2, centre[1] - size / 2];
	const square = (cx: number, cy: number, w: number, h: number, fill: string): Path => ({
		kind: 'print',
		closed: true,
		fill,
		points: [
			[cx, cy],
			[cx + w, cy],
			[cx + w, cy + h],
			[cx, cy + h],
		],
	});
	const paths = [square(left, top, size, size, '#000000')];
	arucoOriginalBits(id).forEach((row, r) => {
		// Merge horizontal runs of white cells to keep the print clean.
		for (let c = 0; c < 5; ) {
			if (row[c] !== 1) {
				c++;
				continue;
			}
			let end = c;
			while (end + 1 < 5 && row[end + 1] === 1) end++;
			paths.push(square(left + (1 + c) * cell, top + (1 + r) * cell, (end - c + 1) * cell, cell, '#ffffff'));
			c = end + 1;
		}
	});
	return paths;
}

/** The marker id printed above the marker, as in Processing (centred on the margin's top edge). */
export function markerLabel(id: number, size: number, centre: Point): Label {
	const outer = (size * 9) / 7;
	const cellPt = (size * 72) / 25.4 / 7;
	return { text: String(id), at: [centre[0], centre[1] - outer / 2], size: (Math.ceil(cellPt * 1.4) * 25.4) / 72, align: 'center', baseline: 'middle' };
}

/** Size of one block's net for laying out copies (Processing bboxW, bboxH). */
export function blockSpacing(input: BlockInput): [number, number] {
	const { x, y } = gridLines(input);
	return [x[5] - 2 * THICKNESS - x[0], y[3] - y[0]];
}

export interface BlockSheet {
	sheet: Sheet;
	/** Marker id of each copy. */
	markerIds: number[];
	fitsCutArea: boolean;
	/** Problems that make the export unusable, e.g. marker ids outside the dictionary. */
	errors: string[];
	/** Problems worth knowing about, e.g. a marker larger than its face. */
	warnings: string[];
}

/**
 * All copies on one sheet, in two columns as Processing lays them out. The cut file uses the
 * same spacing as the print (in Processing the cut copies were spaced at 75 %, see
 * docs/hidden-behaviour.md).
 */
export function buildBlockSheet(input: BlockInput): BlockSheet {
	const copies = Math.max(1, Math.trunc(input.copies));
	const [dx, dy] = blockSpacing(input);
	const paths: Path[] = [];
	const labels: Label[] = [];
	const markerIds: number[] = [];
	const errors: string[] = [];
	const warnings: string[] = [];
	const outer = (input.markerSize * 9) / 7;
	const [faceW, faceL] = [input.markerOnSide ? input.height : input.width, input.length];
	if (outer > Math.min(faceW, faceL)) {
		warnings.push(
			`The marker with its white margin is ${outer.toFixed(1)} mm, larger than its ${faceW} × ${faceL} mm face; cameras need the white margin to detect it.`,
		);
	}
	const lastId = input.firstMarkerId + copies - 1;
	if (input.firstMarkerId < 0 || lastId >= ARUCO_ORIGINAL_SIZE) {
		errors.push(`Marker ids must be 0–${ARUCO_ORIGINAL_SIZE - 1}; these blocks would need ${input.firstMarkerId}–${lastId}.`);
	}
	for (let i = 0; i < copies; i++) {
		const at: Point = [ORIGIN[0] + (i % 2) * dx, ORIGIN[1] + Math.floor(i / 2) * dy];
		const id = input.firstMarkerId + i;
		markerIds.push(id);
		paths.push(...blockPaths(input, at));
		if (id >= 0 && id < ARUCO_ORIGINAL_SIZE) {
			const centre = markerCentre(input, at);
			paths.push(...markerPaths(id, input.markerSize, centre));
			labels.push(markerLabel(id, input.markerSize, centre));
		}
	}
	const sheet: Sheet = { paths, labels };
	return { sheet, markerIds, fitsCutArea: fitsCutArea(sheet), errors, warnings };
}
