// Several nets on one sheet, like Processing's free placement: each net is moved by an offset
// (mm) from where buildNet puts it. Helpers to measure nets, arrange them automatically and
// check that they fit the cutting area without overlapping. The user can then move them.
import { boundsOf, type Path, type Point } from '../../../lib/drawing';
import { CUT_AREA } from '../../../lib/units';
import type { Lid, Net, Panel } from './net';

export interface Bounds {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

const move = ([x, y]: Point, [dx, dy]: Point): Point => [x + dx, y + dy];

/** A net moved by `offset` mm: every path, panel and lid. */
export function translateNet(net: Net, offset: Point): Net {
	if (offset[0] === 0 && offset[1] === 0) return net;
	const paths = net.sheet.paths.map((p): Path => ({ ...p, points: p.points.map((q) => move(q, offset)) }));
	const lid = (l: Lid): Lid => ({ centre: move(l.centre, offset), corners: l.corners.map((c) => move(c, offset)) });
	return {
		...net,
		sheet: { ...net.sheet, paths },
		panels: net.panels.map((p): Panel => ({ corners: p.corners.map((c) => move(c, offset)) as Panel['corners'] })),
		bottomLid: lid(net.bottomLid),
		topLid: lid(net.topLid),
	};
}

/** Bounds of everything the cutter touches (cut and fold lines, tabs included). */
export function netBounds(net: Net): Bounds {
	return boundsOf(net.sheet.paths.filter((p) => p.kind !== 'print')) ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 };
}

export function insideCutArea(b: Bounds): boolean {
	return b.minX >= 0 && b.minY >= 0 && b.maxX <= CUT_AREA.width && b.maxY <= CUT_AREA.height;
}

export function boundsOverlap(a: Bounds, b: Bounds): boolean {
	return a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;
}

/** Index pairs of nets whose bounding boxes overlap. */
export function overlappingPairs(bounds: Bounds[]): [number, number][] {
	const pairs: [number, number][] = [];
	for (let i = 0; i < bounds.length; i++) {
		for (let j = i + 1; j < bounds.length; j++) if (boundsOverlap(bounds[i], bounds[j])) pairs.push([i, j]);
	}
	return pairs;
}

/** Space kept between arranged nets, and from the cutting area's left edge. */
export const ARRANGE_GAP = 3;

/**
 * The calibration crosses are cut through the same sheet, with arms reaching 20 mm in from each
 * corner of the cutting area; nets must stay out of these corner squares (plus a small margin).
 */
export const CROSS_ZONE = 22;

/** True when the bounds reach into one of the four corner squares of the calibration crosses. */
export function touchesCrossZone(b: Bounds): boolean {
	const { width: W, height: H } = CUT_AREA;
	const z = CROSS_ZONE;
	const corners: Bounds[] = [
		{ minX: 0, minY: 0, maxX: z, maxY: z },
		{ minX: W - z, minY: 0, maxX: W, maxY: z },
		{ minX: 0, minY: H - z, maxX: z, maxY: H },
		{ minX: W - z, minY: H - z, maxX: W, maxY: H },
	];
	return corners.some((c) => boundsOverlap(b, c));
}

/**
 * The highest, then leftmost, free spot for a box of `w` × `h` mm: inside the cutting area,
 * clear of the calibration crosses' corner zones and of the `placed` boxes, with `gap` mm
 * around. Candidates are the free area's left edge and top, and the right and bottom edges of
 * placed boxes. Returns the box's top-left, or null when it fits nowhere.
 */
export function findFreeSpot(placed: Bounds[], w: number, h: number, gap = ARRANGE_GAP): Point | null {
	const xs = [gap, ...placed.map((p) => p.maxX + gap)];
	const ys = [CROSS_ZONE, ...placed.map((p) => p.maxY + gap)];
	let best: Point | null = null;
	for (const y of ys) {
		for (const x of xs) {
			const box = { minX: x, minY: y, maxX: x + w, maxY: y + h };
			const padded = { minX: x - gap + 1e-9, minY: y - gap + 1e-9, maxX: x + w + gap - 1e-9, maxY: y + h + gap - 1e-9 };
			if (!insideCutArea(box) || touchesCrossZone(box) || placed.some((p) => boundsOverlap(padded, p))) continue;
			if (!best || y < best[1] || (y === best[1] && x < best[0])) best = [x, y];
		}
	}
	return best;
}

/** The offset that moves a net with `bounds` (at offset 0) into a free spot among `placed`, or null. */
export function offsetIntoFreeSpot(placed: Bounds[], bounds: Bounds, gap = ARRANGE_GAP): Point | null {
	const spot = findFreeSpot(placed, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, gap);
	return spot && [spot[0] - bounds.minX, spot[1] - bounds.minY];
}

/**
 * Offsets that place nets on the sheet one by one, each in the free spot `findFreeSpot`
 * picks; `bounds` are each net's bounds at offset (0, 0). Nets that fit nowhere are stacked
 * below the sheet (outside the cutting area), so the user can see them and leave them off.
 */
export function arrangeOffsets(bounds: Bounds[], gap = ARRANGE_GAP): Point[] {
	const placed: Bounds[] = [];
	let overflowY = CUT_AREA.height + 10;
	return bounds.map((b) => {
		const w = b.maxX - b.minX;
		const h = b.maxY - b.minY;
		let spot = findFreeSpot(placed, w, h, gap);
		if (!spot) {
			spot = [gap, overflowY];
			overflowY += h + gap;
		}
		placed.push({ minX: spot[0], minY: spot[1], maxX: spot[0] + w, maxY: spot[1] + h });
		return [spot[0] - b.minX, spot[1] - b.minY] as Point;
	});
}
