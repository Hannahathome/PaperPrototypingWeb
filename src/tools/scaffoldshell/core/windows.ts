// Windows in the shell where a rig's face meets the paper, so a screen or button shows through.
// Ported from ScaffoldShell's RigCutout.pde (planRigCutout) with LidFrame.pde and
// SidePanelFrame.pde for placing them on the flat net. Millimetres.
import type { Path, Point } from '../../../lib/drawing';
import type { Net } from '../../paperpolyhedra/core/net';
import { shapeDims, type ShapeInput } from '../../paperpolyhedra/core/params';
import { frameDims, frameGeometry, RIG_CUT, type FrameDims, type FrameSettings, type Rig, type Vec3 } from './frame';

/** Preset window sizes (CUTOUT_SIZE_SMALL / LARGE) and their corner radius (cutoutCornerRadius). */
export const WINDOW_SMALL = 16;
export const WINDOW_LARGE = 50;
export const WINDOW_CORNER_RADIUS = 2;
/** A face "reaches" the paper within strut radius + this (RIG_CUT_REACH_SLACK_MM). */
export const REACH_SLACK = 1;
/** Keep windows this far from fold lines and lid edges (RIG_CUT_FOLD_MARGIN_MM). */
export const FOLD_MARGIN = 2;
/** A face must look at a wall within 35° (cos 35° = 0.819) to cut into it. */
export const MIN_ALIGN = 0.819;
/** Points per rounded corner, sampling Processing's quadratic corner curve. */
export const CORNER_STEPS = 8;

export interface WindowPlan {
	rigIndex: number;
	face: number;
	onLid: boolean;
	/** Wall panel index (net panel order), or −1. */
	panel: number;
	/** Centre in the lid's frame (lid centre = 0, 0) or the wall panel's frame (see below). */
	local: Point;
	rotationDeg: number;
	size: number;
	reaches: boolean;
	/** Clear of fold lines and the lid edge (with margin). Windows that do not fit are still cut. */
	fits: boolean;
	/** Distance from the rig face to the paper (mm); negative means it pokes through. */
	gap: number;
	status: string;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addv = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): Vec3 => mul(a, 1 / Math.hypot(...a));
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** pointInPoly (even–odd). */
export function pointInPoly(poly: Point[], x: number, y: number): boolean {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		if (poly[i][1] > y !== poly[j][1] > y && x < ((poly[j][0] - poly[i][0]) * (y - poly[i][1])) / (poly[j][1] - poly[i][1]) + poly[i][0]) inside = !inside;
	}
	return inside;
}

/** squareInPoly: all four corners of a rotated square inside the polygon. */
export function squareInPoly(poly: Point[], centre: Point, rotationDeg: number, side: number): boolean {
	const a = (rotationDeg * Math.PI) / 180;
	const [c, s, h] = [Math.cos(a), Math.sin(a), side / 2];
	return [-1, 1].every((sx) => [-1, 1].every((sy) => pointInPoly(poly, centre[0] + sx * h * c - sy * h * s, centre[1] + sx * h * s + sy * h * c)));
}

/** regularPolygonMM: a lid polygon with edge `edge`, edge 0 on top. */
function regularPolygon(n: number, edge: number): Point[] {
	const r = edge / 2 / Math.sin(Math.PI / n);
	const step = (2 * Math.PI) / n;
	const start = -Math.PI / 2 - step / 2;
	return Array.from({ length: n }, (_, i): Point => [Math.cos(start + i * step) * r, Math.sin(start + i * step) * r]);
}

function windowSize(rig: Rig, faceA: number, faceB: number): number {
	if (rig.cutoutSize === 1) return WINDOW_SMALL;
	if (rig.cutoutSize === 2) return WINDOW_LARGE;
	return Math.min(faceA, faceB) >= WINDOW_LARGE ? WINDOW_LARGE : WINDOW_SMALL;
}

interface PanelFS {
	index: number;
	c: Vec3;
	u: Vec3;
	v: Vec3;
	n: Vec3;
	slant: number;
}

/** rigPanelFS: wall panel k of the shell in frame space (at the entered height, as Processing). */
function panelFS(d: FrameDims, k: number): PanelFS {
	const j = (k + 1) % d.n;
	const a0 = ((k * 360) / d.n + d.phaseDeg) * (Math.PI / 180);
	const a1 = ((j * 360) / d.n + d.phaseDeg) * (Math.PI / 180);
	const [zb, zt] = [-d.height / 2, d.height / 2];
	const B0: Vec3 = [d.botR * Math.cos(a0), d.botR * Math.sin(a0), zb];
	const B1: Vec3 = [d.botR * Math.cos(a1), d.botR * Math.sin(a1), zb];
	const T0: Vec3 = [d.topR * Math.cos(a0), d.topR * Math.sin(a0), zt];
	const T1: Vec3 = [d.topR * Math.cos(a1), d.topR * Math.sin(a1), zt];
	const c = mul(addv(addv(B0, B1), addv(T0, T1)), 0.25);
	const u = norm(sub(mul(addv(B1, T1), 0.5), mul(addv(B0, T0), 0.5)));
	const vRaw = sub(mul(addv(T0, T1), 0.5), mul(addv(B0, B1), 0.5));
	const slant = Math.hypot(...vRaw);
	const v = norm(vRaw);
	let nrm = norm(cross(u, v));
	if (nrm[0] * c[0] + nrm[1] * c[1] < 0) nrm = mul(nrm, -1);
	return { index: k, c, u, v, n: nrm, slant };
}

const distanceText = (where: string, gap: number, tol: number) => `Distance to ${where}: ${gap.toFixed(1)} mm (cuts within ${tol.toFixed(1)} mm).`;

/** planRigCutouts: one plan per rig that has a window face. */
export function planWindows(shape: ShapeInput, s: FrameSettings): WindowPlan[] {
	if (!s.enabled) return [];
	const g = frameGeometry(shape, s);
	if (!g.valid) return [];
	const d = frameDims(shape);
	const tol = s.strutRadius + REACH_SLACK;
	const plans: WindowPlan[] = [];
	s.rigs.forEach((rig, i) => {
		if (rig.cutoutFace === RIG_CUT.none) return;
		const { centre, size } = g.rigs[i].box;
		const [cx, cy, cz] = centre;
		const [w, dp, h] = size;
		if (rig.cutoutFace === RIG_CUT.top) {
			const gap = d.height / 2 - (cz + h / 2);
			const sizeMM = windowSize(rig, w, dp);
			const reaches = gap <= tol;
			const fits = squareInPoly(regularPolygon(d.n, d.topPerimeter / d.n), [cx, cy], rig.rotation, sizeMM + 2 * FOLD_MARGIN);
			let status = distanceText('the top lid', gap, tol);
			status += reaches
				? ` Cuts a ${sizeMM.toFixed(0)} mm square into the top lid.${fits ? '' : " It runs over the lid's edge. Move the rig toward the centre."}`
				: ' No cut. Raise Offset Z or Height.';
			plans.push({ rigIndex: i, face: rig.cutoutFace, onLid: true, panel: -1, local: [cx, cy], rotationDeg: rig.rotation, size: sizeMM, reaches, fits, gap, status });
			return;
		}
		// A side face: its outward normal and in-face axis, rotated with the rig.
		const faces: Record<number, [number, number, number, number]> = {
			[RIG_CUT.posY]: [0, 1, dp / 2, w],
			[RIG_CUT.negY]: [0, -1, dp / 2, w],
			[RIG_CUT.posX]: [1, 0, w / 2, dp],
			[RIG_CUT.negX]: [-1, 0, w / 2, dp],
		};
		const [nx, ny, halfN, faceW] = faces[rig.cutoutFace];
		const a = (rig.rotation * Math.PI) / 180;
		const nF: Vec3 = [nx * Math.cos(a) - ny * Math.sin(a), nx * Math.sin(a) + ny * Math.cos(a), 0];
		const tF: Vec3 = [-nF[1], nF[0], 0];
		const P: Vec3 = [cx + nF[0] * halfN, cy + nF[1] * halfN, cz];
		const corners: Vec3[] = [];
		for (const su of [-1, 1]) for (const sz of [-1, 1]) corners.push([P[0] + (tF[0] * su * faceW) / 2, P[1] + (tF[1] * su * faceW) / 2, P[2] + (sz * h) / 2]);
		let best: PanelFS | null = null;
		let bestGap = Number.MAX_VALUE;
		for (let k = 0; k < d.n; k++) {
			const pan = panelFS(d, k);
			if (dot(nF, pan.n) < MIN_ALIGN) continue;
			const gap = Math.min(...corners.map((q) => dot(sub(pan.c, q), pan.n)));
			if (gap < bestGap) [bestGap, best] = [gap, pan];
		}
		const sizeMM = windowSize(rig, faceW, h);
		if (!best) {
			plans.push({ rigIndex: i, face: rig.cutoutFace, onLid: false, panel: -1, local: [0, 0], rotationDeg: 0, size: sizeMM, reaches: false, fits: false, gap: Number.NaN, status: 'No cut: this face does not look squarely at a wall. Rotate the rig.' });
			return;
		}
		const Q = addv(P, mul(best.n, dot(sub(best.c, P), best.n)));
		const dd = sub(Q, best.c);
		const flatH = shapeDims(shape).panelHeight; // rigPanelFlatHeightMM: the net's panel height
		const local: Point = [dot(dd, best.u), (dot(dd, best.v) * flatH) / best.slant];
		const b = d.bottomPerimeter / d.n / 2 - FOLD_MARGIN;
		const t = d.topPerimeter / d.n / 2 - FOLD_MARGIN;
		const hh = flatH / 2 - FOLD_MARGIN;
		const fits = squareInPoly(
			[
				[-b, -hh],
				[b, -hh],
				[t, hh],
				[-t, hh],
			],
			local,
			0,
			sizeMM,
		);
		const reaches = bestGap <= tol;
		const where = `wall panel ${best.index + 1}`;
		let status = distanceText(where, bestGap, tol);
		status += reaches
			? ` Cuts a ${sizeMM.toFixed(0)} mm square into ${where}.${fits ? '' : ' It crosses a fold line. Move the rig along the wall, or pick a smaller size.'}`
			: ' No cut. Move the rig toward it.';
		plans.push({ rigIndex: i, face: rig.cutoutFace, onLid: false, panel: best.index, local, rotationDeg: 0, size: sizeMM, reaches, fits, gap: bestGap, status });
	});
	return plans;
}

/**
 * A rounded square centred on the origin, as Processing's rect(0, 0, s, s, r) in CENTER mode
 * draws it: straight sides and quadratic corners with the control point at the sharp corner.
 */
export function roundedSquare(side: number, radius = WINDOW_CORNER_RADIUS, steps = CORNER_STEPS): Point[] {
	const [x1, y1, x2, y2] = [-side / 2, -side / 2, side / 2, side / 2];
	const r = Math.min(radius, side / 2);
	const quad = (p0: Point, c: Point, p1: Point): Point[] =>
		Array.from({ length: steps }, (_, k): Point => {
			const t = (k + 1) / steps;
			const m = 1 - t;
			return [m * m * p0[0] + 2 * m * t * c[0] + t * t * p1[0], m * m * p0[1] + 2 * m * t * c[1] + t * t * p1[1]];
		});
	return [
		[x2 - r, y1],
		...quad([x2 - r, y1], [x2, y1], [x2, y1 + r]),
		[x2, y2 - r],
		...quad([x2, y2 - r], [x2, y2], [x2 - r, y2]),
		[x1 + r, y2],
		...quad([x1 + r, y2], [x1, y2], [x1, y2 - r]),
		[x1, y1 + r],
		...quad([x1, y1 + r], [x1, y1], [x1 + r, y1]),
	];
}

/** Cut paths for the windows that reach the paper, placed on `net` (lid or wall panel frame). */
export function windowPaths(net: Net, plans: WindowPlan[]): Path[] {
	return plans
		.filter((p) => p.reaches && (p.onLid || p.panel >= 0))
		.map((p): Path => {
			let origin: Point;
			let rotation: number;
			if (p.onLid) {
				origin = [net.topLid.centre[0] + p.local[0], net.topLid.centre[1] + p.local[1]];
				rotation = (p.rotationDeg * Math.PI) / 180;
			} else {
				// SidePanelFrame: origin at the panel's centre, x along its bottom edge, y towards the top edge.
				const [bl, br, tr, tl] = net.panels[p.panel].corners;
				const centre: Point = [(bl[0] + br[0] + tr[0] + tl[0]) / 4, (bl[1] + br[1] + tr[1] + tl[1]) / 4];
				rotation = Math.atan2(br[1] - bl[1], br[0] - bl[0]);
				const [c, s] = [Math.cos(rotation), Math.sin(rotation)];
				origin = [centre[0] + p.local[0] * c - p.local[1] * s, centre[1] + p.local[0] * s + p.local[1] * c];
			}
			const [c, s] = [Math.cos(rotation), Math.sin(rotation)];
			return { kind: 'cut', closed: true, points: roundedSquare(p.size).map(([x, y]): Point => [origin[0] + x * c - y * s, origin[1] + x * s + y * c]) };
		});
}
