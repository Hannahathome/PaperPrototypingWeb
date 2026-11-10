// The flat net of a uniform prism or frustum: a strip of trapezoid panels with tabs, the glue
// flap and hook tab that close it, and two polygon lids. Ported from PaperPolyhedra
// (tools.pde drawTzTopFolds/drawTzFoldlines, api.pde tab/flap/lid drawing, drawPlan layout).
//
// Coordinates are mm on the page, y down. Each panel is built in its own frame (bottom edge
// from (0,0) to (b,0), top edge at y = h) and placed by the same translate-then-rotate chain
// Processing uses. Fold lines keep Processing's start and end points, because the dash
// pattern depends on direction.
import type { Path, Point, Sheet } from '../../../lib/drawing';
import { fitsCutArea } from '../../../lib/export';
import {
	circumradius,
	HOOK_NECK_RATIO,
	HOOK_OFFSET_MM,
	LID_TAB_NECK_RATIO,
	PATTERN_ORIGIN,
	shapeDims,
	STRIP_TAB_NECK_RATIO,
	type ShapeDims,
	type ShapeInput,
} from './params';

/** 2D affine transform with Processing's translate/rotate semantics (M = M · T, M = M · R). */
class Frame {
	constructor(
		private c = 1,
		private s = 0,
		private tx = 0,
		private ty = 0,
	) {}

	apply([x, y]: Point): Point {
		return [this.c * x - this.s * y + this.tx, this.s * x + this.c * y + this.ty];
	}

	translate(dx: number, dy: number): this {
		this.tx += this.c * dx - this.s * dy;
		this.ty += this.s * dx + this.c * dy;
		return this;
	}

	rotate(angle: number): this {
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		[this.c, this.s] = [this.c * cos - this.s * sin, this.s * cos + this.c * sin];
		return this;
	}

	clone(): Frame {
		return new Frame(this.c, this.s, this.tx, this.ty);
	}
}

type V = readonly [number, number];
const add = (a: V, b: V): Point => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V, b: V): Point => [a[0] - b[0], a[1] - b[1]];
const scale = (a: V, k: number): Point => [a[0] * k, a[1] * k];
const unit = (a: V): Point => scale(a, 1 / Math.hypot(a[0], a[1]));

/** A shape-local path builder that maps points through a frame. */
class Pen {
	readonly paths: Path[] = [];
	constructor(public frame: Frame) {}
	cut(...points: Point[]): void {
		this.paths.push({ kind: 'cut', points: points.map((p) => this.frame.apply(p)) });
	}
	fold(from: Point, to: Point): void {
		this.paths.push({ kind: 'fold', points: [this.frame.apply(from), this.frame.apply(to)] });
	}
}

/** Bottom-edge tab on the right half of the edge (api.pde drawBottomTabContour). */
function bottomTab(pen: Pen, b: number, depth: number, inset: number, flare: number, neck: number): void {
	pen.fold([b, 0], [2 * inset, 0]);
	pen.cut([b, 0], [b, -neck], [b - flare, -depth], [2 * inset + flare, -depth], [2 * inset, -neck], [2 * inset, 0], [0, 0]);
}

/** Top-edge tab on the left half of the edge (api.pde drawTopTabContour). */
function topTab(pen: Pen, x: number, h: number, t: number, depth: number, inset: number, flare: number, neck: number): void {
	const end = x + t - 2 * inset;
	pen.fold([x, h], [end, h]);
	pen.cut([x, h], [x, h + neck], [x + flare, h + depth], [end - flare, h + depth], [end, h + neck], [end, h], [x + t, h]);
}

/** Glue flap on the first panel's left edge, with a slit for the hook (api.pde drawLeftSlantFlap). */
function leftFlap(pen: Pen, p1: Point, p4: Point, depth: number, taper: number, inset: number): void {
	const edge = sub(p1, p4);
	const e = unit(edge);
	const perp = scale(unit([edge[1], -edge[0]]), depth);
	const p1Inset = sub(p1, scale(e, inset));
	const p4Inset = add(p4, scale(e, inset));
	const p1Flap = sub(add(p1, perp), scale(e, taper));
	const p4Flap = add(add(p4, perp), scale(e, taper));
	pen.fold(p4, p4Inset);
	pen.cut(p4Inset, p1Inset);
	pen.fold(p1Inset, p1);
	pen.cut(p4, p4Flap, p1Flap, p1);
}

/** Hook tab on the last panel's right edge (api.pde drawRightSlantFlap). */
function rightHook(pen: Pen, p2: Point, p3: Point, depth: number, inset: number, flare: number, neck: number, hookOffset: number): void {
	const e = unit(sub(p3, p2));
	const p2Inset = add(p2, scale(e, inset));
	const p3Inset = sub(p3, scale(e, inset));
	const insetEdge = sub(p3Inset, p2Inset);
	const perp = unit([insetEdge[1], -insetEdge[0]]);
	const p2Rect = add(p2Inset, scale(perp, depth));
	const p3Rect = add(p3Inset, scale(perp, depth));
	const p2Neck = add(p2Inset, scale(perp, neck));
	const p3Neck = add(p3Inset, scale(perp, neck));
	const neckDir = unit(sub(p3Neck, p2Neck));
	const p2Hook = add(p2Neck, scale(neckDir, hookOffset));
	const p3Hook = sub(p3Neck, scale(neckDir, hookOffset));
	const outerDir = unit(sub(p3Rect, p2Rect));
	const p2Flap = add(p2Rect, scale(outerDir, flare));
	const p3Flap = sub(p3Rect, scale(outerDir, flare));
	pen.fold(p3Inset, p2Inset);
	pen.cut(p3, p3Inset, p3Hook, p3Flap, p2Flap, p2Hook, p2Inset, p2);
}

/** Rotation between consecutive panels so their slanted edges meet. */
function panelRotation(t: number, b: number, h: number): number {
	return Math.atan2(h, (t - b) / 2) - Math.atan2(h, (b - t) / 2);
}

export interface Panel {
	/** Corners on the page: bottom-left, bottom-right, top-right, top-left (model's bottom rim first). */
	corners: [Point, Point, Point, Point];
}

export interface StripResult {
	paths: Path[];
	panels: Panel[];
	/** Largest y of any panel corner, tabs excluded (Processing getStripHeight()). */
	height: number;
}

/** The side strip, at the origin. */
export function buildStrip(d: ShapeDims): StripResult {
	const { sides: n, topSide: t, bottomSide: b, panelHeight: h, tabDepth } = d;
	const offset = (b - t) / 2;
	const rotation = panelRotation(t, b, h);
	const insetBottom = b / 4;
	const insetTop = t / 4;
	const insetSide = h / 4;
	const pen = new Pen(new Frame());
	const panels: Panel[] = [];
	let height = h;

	for (let k = 0; k < n; k++) {
		const corners: [Point, Point, Point, Point] = [
			pen.frame.apply([0, 0]),
			pen.frame.apply([b, 0]),
			pen.frame.apply([offset + t, h]),
			pen.frame.apply([offset, h]),
		];
		panels.push({ corners });
		height = Math.max(height, ...corners.map((p) => p[1]));

		bottomTab(pen, b, tabDepth, insetBottom, insetBottom / 3, tabDepth * STRIP_TAB_NECK_RATIO);
		topTab(pen, offset, h, t, tabDepth, insetTop, insetTop / 3, tabDepth * STRIP_TAB_NECK_RATIO);
		if (k === 0) leftFlap(pen, [0, 0], [offset, h], d.flapDepth, d.flapTaper, insetSide);
		if (k === n - 1) {
			rightHook(pen, [b, 0], [offset + t, h], d.flapDepth, insetSide, insetSide / 3, tabDepth * HOOK_NECK_RATIO, HOOK_OFFSET_MM);
		}
		if (k < n - 1) {
			pen.fold([b, 0], [offset + t, h]);
			pen.frame.translate(b, 0).rotate(rotation);
		}
	}
	return { paths: pen.paths, panels, height };
}

/** Bounding box size of a lid including its tabs (api.pde getPolygonLidDimensions). */
export function lidDimensions(sides: number, side: number, tabDepth: number): { width: number; height: number } {
	const r = circumradius(sides, side);
	const step = (2 * Math.PI) / sides;
	const start = -Math.PI / 2 - step / 2;
	const xs: number[] = [];
	const ys: number[] = [];
	for (let i = 0; i < sides; i++) {
		xs.push(Math.cos(start + i * step) * r);
		ys.push(Math.sin(start + i * step) * r);
	}
	return {
		width: Math.max(...xs) - Math.min(...xs) + 2 * tabDepth,
		height: Math.max(...ys) - Math.min(...ys) + 2 * tabDepth,
	};
}

export interface Lid {
	centre: Point;
	/** Polygon corners on the page, in order. */
	corners: Point[];
}

/** A lid with tabs on every side, placed with its box's top-left at `origin` (api.pde drawPolygonLid). */
export function buildLid(sides: number, side: number, tabDepth: number, origin: Point): { paths: Path[]; lid: Lid } {
	const r = circumradius(sides, side);
	const step = (2 * Math.PI) / sides;
	const a = r * Math.cos(step / 2);
	const half = a + tabDepth;
	const centre: Point = [origin[0] + half, origin[1] + half];
	const inset = side / 4;
	const flare = inset / 3;
	const neck = tabDepth * LID_TAB_NECK_RATIO;
	const paths: Path[] = [];
	const corners: Point[] = [];

	for (let i = 0; i < sides; i++) {
		const pen = new Pen(new Frame().translate(centre[0], centre[1]).rotate(i * step).translate(0, -a));
		const s2 = side / 2;
		pen.fold([-s2 + 2 * inset, 0], [s2, 0]);
		pen.cut([-s2, 0], [-s2 + 2 * inset, 0], [-s2 + 2 * inset, -neck], [-s2 + 2 * inset + flare, -tabDepth], [s2 - flare, -tabDepth], [s2, -neck], [s2, 0]);
		paths.push(...pen.paths);
		corners.push(pen.frame.apply([-s2, 0]));
	}
	return { paths, lid: { centre, corners } };
}

export interface Net {
	dims: ShapeDims;
	sheet: Sheet;
	panels: Panel[];
	bottomLid: Lid;
	topLid: Lid;
	/** True when every cut and fold line lies inside the 280 × 200 mm cutting area. */
	fitsCutArea: boolean;
}

function translatePaths(paths: Path[], [dx, dy]: readonly [number, number]): Path[] {
	return paths.map((path) => ({ ...path, points: path.points.map(([x, y]): Point => [x + dx, y + dy]) }));
}

/** The complete net for one shape, laid out on the page as Processing lays it out. */
export function buildNet(input: ShapeInput): Net {
	const dims = shapeDims(input);
	const { sides: n, topSide, bottomSide, tabDepth } = dims;

	const strip = buildStrip(dims);
	const bottomBox = lidDimensions(n, bottomSide, tabDepth);
	const topBox = lidDimensions(n, topSide, tabDepth);
	const extra = Math.max(0, topBox.height - bottomBox.height);
	const lidSpacing = Math.max(strip.height * 1.25, strip.height + tabDepth + extra + 2);

	const bottom = buildLid(n, bottomSide, tabDepth, [0, lidSpacing]);
	const top = buildLid(n, topSide, tabDepth, [bottomBox.width, lidSpacing + bottomBox.height - topBox.height]);

	const origin = PATTERN_ORIGIN;
	const move = (p: Point): Point => [p[0] + origin[0], p[1] + origin[1]];
	const moveLid = (lid: Lid): Lid => ({ centre: move(lid.centre), corners: lid.corners.map(move) });
	const sheet: Sheet = { paths: translatePaths([...strip.paths, ...bottom.paths, ...top.paths], origin) };

	return {
		dims,
		sheet,
		panels: strip.panels.map((panel) => ({ corners: panel.corners.map(move) as Panel['corners'] })),
		bottomLid: moveLid(bottom.lid),
		topLid: moveLid(top.lid),
		fitsCutArea: fitsCutArea(sheet),
	};
}
