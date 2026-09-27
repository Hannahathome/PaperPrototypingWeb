// Phicon Widgets: a PaperPhicons block with cut-outs in its base face, ported from the TEI'27
// sketch PaperPhicons_Boilerplate_v1_1_Cutout (Cutouts.pde). Millimetres, y down.
//
// The block net is PaperPhicons' (identical code in both sketches). Cut-outs are closed cut paths
// positioned from the centre of the base face (the W × L face that carries the marker unless it
// is on the side wall), drawn before the net in every copy. Their outlines are the polygons
// Processing draws: circles as 64 points, pill ends as 25 points each.
import type { Path, Point } from '../../../lib/drawing';
import { buildBlockSheet, FRONT_COLOUR, gridLines, type BlockInput, type BlockSheet } from '../../paperphicons/core/block';

export type CutoutShape = 'square' | 'pill' | 'circle';

export interface Cutout {
	shape: CutoutShape;
	/** Square: width. Pill: overall length. Circle: diameter. */
	width: number;
	/** Square: height. Pill: width (its ends are half-circles of this diameter). Circle: unused. */
	height: number;
	/** Offset of the centre from the centre of the base face (mm, + = right). */
	x: number;
	/** Offset of the centre from the centre of the base face (mm, + = down on the sheet). */
	y: number;
	/** Pill only: run the length down the face instead of across it. */
	vertical: boolean;
}

export interface WidgetInput extends BlockInput {
	cutouts: Cutout[];
}

/** Points on a circle outline (circlePoints). */
export const CIRCLE_POINTS = 64;
/** Segments per half-circle of a pill (pillPoints); each end has one point more. */
export const PILL_SEGMENTS = 24;

/** The sketch's defaults: a 30 mm cube, marker 0 of 16 mm, and one 20 mm square cut-out. */
export const DEFAULT_WIDGET: WidgetInput = {
	width: 30,
	length: 30,
	height: 30,
	firstMarkerId: 0,
	markerSize: 16,
	copies: 1,
	markerOnSide: false,
	markerOffsetY: 0,
	cutouts: [],
};

export const NEW_CUTOUT: Cutout = { shape: 'square', width: 20, height: 20, x: 0, y: 0, vertical: false };

/**
 * What the web app opens with. The sketch opens with a 20 mm square over the marker; the app
 * opens with a knob hole instead, with the marker moved to the side wall, so the example passes
 * its own checks.
 */
export const STARTING_WIDGET: WidgetInput = {
	...DEFAULT_WIDGET,
	markerOnSide: true,
	cutouts: [{ shape: 'circle', width: 20, height: 20, x: 0, y: 0, vertical: false }],
};

/** Centre of the base face (W × L) of the block with its top-left at `at`. */
export function baseFaceCentre(input: Pick<BlockInput, 'width' | 'length' | 'height'>, at: Point): Point {
	const { x, y } = gridLines(input);
	return [at[0] + (x[1] + x[2]) / 2, at[1] + (y[1] + y[2]) / 2];
}

/** Width and height on the sheet: a vertical pill swaps its length and width. */
export function cutoutExtent(c: Cutout): [number, number] {
	if (c.shape === 'circle') return [c.width, c.width];
	if (c.shape === 'pill' && c.vertical) return [c.height, c.width];
	return [c.width, c.height];
}

/** The closed outline of a cut-out whose face centre is `faceCentre`, as Processing draws it. */
export function cutoutOutline(c: Cutout, faceCentre: Point): Point[] {
	const cx = faceCentre[0] + c.x;
	const cy = faceCentre[1] + c.y;
	const [ww, hh] = cutoutExtent(c);
	if (c.shape === 'circle') {
		const r = c.width / 2;
		return Array.from({ length: CIRCLE_POINTS }, (_, i) => {
			const a = (2 * Math.PI * i) / CIRCLE_POINTS;
			return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Point;
		});
	}
	if (c.shape === 'pill') {
		// Straight sides along the longer dimension; ends are half-circles of half the shorter one.
		const r = Math.min(ww, hh) / 2;
		const points: Point[] = [];
		const arc = (ox: number, oy: number, start: number) => {
			for (let i = 0; i <= PILL_SEGMENTS; i++) {
				const a = start + (Math.PI * i) / PILL_SEGMENTS;
				points.push([ox + Math.cos(a) * r, oy + Math.sin(a) * r]);
			}
		};
		if (ww >= hh) {
			const sx = ww / 2 - r;
			arc(cx + sx, cy, -Math.PI / 2);
			arc(cx - sx, cy, Math.PI / 2);
		} else {
			const sy = hh / 2 - r;
			arc(cx, cy + sy, 0);
			arc(cx, cy - sy, Math.PI);
		}
		return points;
	}
	const [hw, hh2] = [ww / 2, hh / 2];
	return [
		[cx - hw, cy - hh2],
		[cx + hw, cy - hh2],
		[cx + hw, cy + hh2],
		[cx - hw, cy + hh2],
	];
}

/** The cut-outs of one copy as cut paths. */
export function cutoutPaths(input: WidgetInput, at: Point): Path[] {
	const centre = baseFaceCentre(input, at);
	return input.cutouts.map((c) => ({ kind: 'cut', closed: true, colour: FRONT_COLOUR, points: cutoutOutline(c, centre) }));
}

/**
 * Distance between a cut-out's shape and an axis-aligned rectangle (both relative to the face
 * centre), negative when they overlap. Every shape is a segment swept by a radius: a square has
 * radius 0 and is handled as a box, a circle is a point.
 */
function overlaps(c: Cutout, rect: { minX: number; maxX: number; minY: number; maxY: number }): boolean {
	const [ww, hh] = cutoutExtent(c);
	if (c.shape === 'square') {
		return c.x - ww / 2 < rect.maxX && c.x + ww / 2 > rect.minX && c.y - hh / 2 < rect.maxY && c.y + hh / 2 > rect.minY;
	}
	const r = Math.min(ww, hh) / 2;
	const [hx, hy] = [ww / 2 - r, hh / 2 - r];
	const dx = Math.max(0, rect.minX - (c.x + hx), c.x - hx - rect.maxX);
	const dy = Math.max(0, rect.minY - (c.y + hy), c.y - hy - rect.maxY);
	return Math.hypot(dx, dy) < r - 1e-9;
}

/** A readable name for a cut-out in notes, e.g. "Cut-out 2 (pill)". */
const cutoutName = (i: number, c: Cutout) => `Cut-out ${i + 1} (${c.shape})`;

/**
 * Checks on the cut-outs: sizes (errors) and whether they stay on the base face and clear of
 * the marker and its white margin (warnings). Processing checks none of these.
 */
export function checkCutouts(input: WidgetInput): { errors: string[]; warnings: string[] } {
	const errors: string[] = [];
	const warnings: string[] = [];
	const [hw, hl] = [input.width / 2, input.length / 2];
	const outer = (input.markerSize * 9) / 7;
	const offset = input.markerOffsetY ?? 0;
	input.cutouts.forEach((c, i) => {
		const sizes = c.shape === 'circle' ? [c.width] : [c.width, c.height];
		if (sizes.some((v) => !(v > 0))) {
			errors.push(`${cutoutName(i, c)} needs a size larger than 0.`);
			return;
		}
		const [ww, hh] = cutoutExtent(c);
		if (Math.abs(c.x) + ww / 2 > hw + 1e-9 || Math.abs(c.y) + hh / 2 > hl + 1e-9) {
			warnings.push(`${cutoutName(i, c)} reaches past the ${input.width} × ${input.length} mm face and cuts into the folds next to it.`);
		}
		if (!input.markerOnSide && overlaps(c, { minX: -outer / 2, maxX: outer / 2, minY: offset - outer / 2, maxY: offset + outer / 2 })) {
			warnings.push(`${cutoutName(i, c)} cuts into the marker or its white margin; a camera may not detect it. Move the marker (offset, or onto the side wall) or the cut-out.`);
		}
	});
	return { errors, warnings };
}

/** All copies with their cut-outs, plus the block and cut-out checks. */
export function buildWidgetSheet(input: WidgetInput): BlockSheet {
	const result = buildBlockSheet(input, (at) => cutoutPaths(input, at));
	const checks = checkCutouts(input);
	return { ...result, errors: [...result.errors, ...checks.errors], warnings: [...result.warnings, ...checks.warnings] };
}
