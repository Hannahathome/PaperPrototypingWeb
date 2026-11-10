// The scaffold: a strut frame sized from the PaperPolyhedra shell it goes inside, ported from
// ScaffoldShell's Frame.pde. The frustum is read off the shell (perimeters → circumradii,
// minus a clearance) and turned by −90 − 180/n so the wall struts sit in the shell's folded
// corners. Millimetres, "frame space" (FS): z up, origin at the middle of the frame's height.
//
// Numbers that end up in the .scad are computed in 32-bit floats step by step, as Processing
// computes them, so the written file matches ScaffoldShell's exactly.
import type { ShapeInput } from '../../paperpolyhedra/core/params';

const f = Math.fround;
/** Processing's PI (a float). */
const PI_F = f(Math.PI);
const sinF = (x: number) => f(Math.sin(f(x)));

export type Vec3 = [x: number, y: number, z: number];
export type Segment = [Vec3, Vec3];

export const RIG_CUT = { none: 0, top: 1, posY: 2, negY: 3, posX: 4, negX: 5 } as const;
export type RigCutFace = (typeof RIG_CUT)[keyof typeof RIG_CUT];
export const RIG_CUT_FACE_NAMES = ['None', 'Top', 'Front (+Y)', 'Back (−Y)', 'Right (+X)', 'Left (−X)'] as const;
export const RIG_CUT_SIZE_NAMES = ['Auto', '16 mm', '50 mm'] as const;

export interface Rig {
	/** Preset name or "Custom"; only a comment in the .scad. */
	preset: string;
	width: number;
	depth: number;
	height: number;
	offsetX: number;
	offsetY: number;
	/** Height of the rig's base above the frame floor (before Processing's −2 × strut radius). */
	offsetZ: number;
	/** Yaw in degrees about the rig's own (offsetX, offsetY). */
	rotation: number;
	/** Which face cuts a window in the shell. */
	cutoutFace: RigCutFace;
	/** 0 = Auto, 1 = 16 mm, 2 = 50 mm. */
	cutoutSize: 0 | 1 | 2;
}

export interface FrameSettings {
	enabled: boolean;
	/** Printed strut radius (mm); also the vertex sphere radius. */
	strutRadius: number;
	/** Gap between shell and frame (mm): paper thickness and fold slop. Measure it. */
	clearance: number;
	/** Two posts per rig face instead of one. */
	dualStruts: boolean;
	/** Gap between paired posts (mm). */
	strutSpacing: number;
	/** Wedge flap at the top of each wall strut (mm); editable in OpenSCAD. */
	flapLength: number;
	rigs: Rig[];
}

/** ScaffoldShell's defaults (FrameSpec, FRAME_CLEARANCE_DEFAULT). */
export const DEFAULT_FRAME_SETTINGS: FrameSettings = {
	enabled: false,
	strutRadius: 1,
	clearance: 0.4,
	dualStruts: false,
	strutSpacing: 15,
	flapLength: 8,
	rigs: [],
};

/** A new rig when the list is empty (frameAddRig); otherwise the app copies the selected one. */
export const NEW_RIG: Rig = { preset: 'Custom', width: 24, depth: 24, height: 31.5, offsetX: 0, offsetY: 0, offsetZ: 8.5, rotation: 0, cutoutFace: 0, cutoutSize: 0 };

/** Component presets, width × depth × height (RIG_PRESET_NAMES / RIG_PRESET_WDH). */
export const RIG_PRESETS: Record<string, [number, number, number]> = {
	M5Atom: [24, 24, 31.5],
	'M5Atom lying': [24, 31.5, 24],
	M5Core: [54, 17, 54],
	'M5Core lying': [54, 54, 17],
	'M5Core+Ext': [54, 21, 54],
	'M5Core+Ext lying': [54, 54, 21],
};

/** The preset matching a rig's size exactly, or "Custom" (frameRigPresetIndex). */
export function presetFor(rig: Pick<Rig, 'width' | 'depth' | 'height'>): string {
	const hit = Object.entries(RIG_PRESETS).find(([, [w, d, h]]) => w === rig.width && d === rig.depth && h === rig.height);
	return hit ? hit[0] : 'Custom';
}

/** Perimeter from the UI diameter, in floats as applyToModel() computes it. */
export function processingPerimeter(sides: number, diameter: number): number {
	const d = f(Math.max(1, diameter));
	return sides === 4 ? f(4 * d) : f(f(sides * d) * sinF(PI_F / sides));
}

/** R = perimeter / (2·n·sin(π/n)) (circumradiusFromPerimeterMM). */
export function circumradiusFromPerimeter(perimeter: number, n: number): number {
	const m = Math.max(3, n);
	return f(f(perimeter) / f(f(2 * m) * sinF(PI_F / m)));
}

/** −90 − 180/n: carries OpenSCAD's vertex 0 at 0° onto the net's edge 0 midpoint at −90°. */
export function framePhaseDeg(n: number): number {
	return f(-90 - f(180 / Math.max(3, n)));
}

/** The shell as the frustum the frame must fit inside (FrameDims). No clearance applied. */
export interface FrameDims {
	n: number;
	topPerimeter: number;
	bottomPerimeter: number;
	topR: number;
	botR: number;
	/**
	 * The ENTERED height, as ScaffoldShell uses it. For frustums the paper folds to a different
	 * height (see docs/hidden-behaviour.md, "Scaffold height"); kept as Processing does it, by
	 * decision, for Hannah to review.
	 */
	height: number;
	phaseDeg: number;
}

export function frameDims(shape: ShapeInput): FrameDims {
	const n = Math.max(3, Math.round(shape.sides));
	const topPerimeter = processingPerimeter(n, shape.topDiameter);
	const bottomPerimeter = processingPerimeter(n, shape.bottomDiameter);
	return {
		n,
		topPerimeter,
		bottomPerimeter,
		topR: circumradiusFromPerimeter(topPerimeter, n),
		botR: circumradiusFromPerimeter(bottomPerimeter, n),
		height: f(Math.max(1, shape.height)),
		phaseDeg: framePhaseDeg(n),
	};
}

/** What is passed to OpenSCAD: the shell pulled in by the clearance (FrameScadParams). */
export interface FrameScadParams {
	n: number;
	botR: number;
	topR: number;
	height: number;
	strutRadius: number;
	phaseDeg: number;
	valid: boolean;
	problem: string;
}

export function frameScadParams(shape: ShapeInput, s: FrameSettings): FrameScadParams {
	const d = frameDims(shape);
	const c = f(s.clearance);
	const e = f(s.strutRadius);
	const p: FrameScadParams = {
		n: d.n,
		phaseDeg: d.phaseDeg,
		strutRadius: e,
		botR: f(d.botR - c),
		topR: f(d.topR - c),
		height: f(d.height - f(2 * c)),
		valid: true,
		problem: '',
	};
	if (f(p.height - f(2 * e)) <= 0) {
		p.valid = false;
		p.problem = 'strut radius and clearance exceed the shell height';
	} else if (f(Math.min(p.botR, p.topR) - e) <= 0) {
		p.valid = false;
		p.problem = 'strut radius and clearance exceed the shell radius';
	}
	return p;
}

export interface RigGeometry {
	spine: Segment;
	baseLink: Segment;
	posts: Segment[];
	connectors: Segment[];
	/** Reference box: centre, size (w, d, h) and yaw in degrees. */
	box: { centre: Vec3; size: Vec3; rotation: number };
}

export interface FrameGeometry {
	valid: boolean;
	problem: string;
	strutRadius: number;
	bottom: Vec3[];
	top: Vec3[];
	ring: Segment[];
	wallStruts: Segment[];
	floorSpokes: Segment[];
	rigs: RigGeometry[];
	/** Strut-centreline planes. */
	zBottom: number;
	zTop: number;
	/** Highest rig top, for the "rig pokes out of the shell" warning. */
	highestRigTop: number;
}

/** The whole frame (buildFrameGeometry): read by the 3D preview and the window planner. */
export function frameGeometry(shape: ShapeInput, s: FrameSettings): FrameGeometry {
	const p = frameScadParams(shape, s);
	const e = s.strutRadius;
	const empty: FrameGeometry = { valid: p.valid, problem: p.problem, strutRadius: e, bottom: [], top: [], ring: [], wallStruts: [], floorSpokes: [], rigs: [], zBottom: 0, zTop: 0, highestRigTop: 0 };
	if (!p.valid) return empty;
	const botR = p.botR - e;
	const topR = p.topR - e;
	const h = p.height - 2 * e;
	const zBottom = -h / 2;
	const zTop = h / 2;
	const n = p.n;
	const bottom: Vec3[] = [];
	const top: Vec3[] = [];
	for (let i = 0; i < n; i++) {
		const a = ((i * 360) / n + p.phaseDeg) * (Math.PI / 180);
		bottom.push([botR * Math.cos(a), botR * Math.sin(a), zBottom]);
		top.push([topR * Math.cos(a), topR * Math.sin(a), zTop]);
	}
	const g: FrameGeometry = {
		...empty,
		bottom,
		top,
		ring: bottom.map((b, i): Segment => [b, bottom[(i + 1) % n]]),
		wallStruts: bottom.map((b, i): Segment => [b, top[i]]),
		zBottom,
		zTop,
		highestRigTop: zTop,
	};
	if (s.rigs.length === 0) return g;
	// Floor spokes brace the ring against the axis; only needed to carry rigs.
	const axis: Vec3 = [0, 0, zBottom];
	for (let i = 0; i < n; i++) {
		const [p0, p1] = [bottom[i], bottom[(i + 1) % n]];
		g.floorSpokes.push([[(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, zBottom], axis]);
	}
	for (const r of s.rigs) {
		const hx = r.width / 2;
		const hy = r.depth / 2;
		const zBoxBottom = zBottom + r.offsetZ - e * 2;
		const zBoxTop = zBoxBottom + r.height;
		g.highestRigTop = Math.max(g.highestRigTop, zBoxTop);
		const start: Vec3 = [r.offsetX, r.offsetY, zBottom];
		const half = s.strutSpacing / 2;
		const locals: [number, number][] = s.dualStruts
			? [
					[-half, hy + e],
					[half, hy + e],
					[-half, -(hy + e)],
					[half, -(hy + e)],
					[hx + e, -half],
					[hx + e, half],
					[-(hx + e), -half],
					[-(hx + e), half],
				]
			: [
					[0, hy + e],
					[0, -(hy + e)],
					[hx + e, 0],
					[-(hx + e), 0],
				];
		const a = (r.rotation * Math.PI) / 180;
		const posts: Segment[] = [];
		const connectors: Segment[] = [];
		for (const [lx, ly] of locals) {
			const x = r.offsetX + lx * Math.cos(a) - ly * Math.sin(a);
			const y = r.offsetY + lx * Math.sin(a) + ly * Math.cos(a);
			posts.push([
				[x, y, zBottom],
				[x, y, zBoxTop],
			]);
			connectors.push([start, [x, y, zBottom]]);
		}
		g.rigs.push({
			spine: [start, [r.offsetX, r.offsetY, zBoxBottom]],
			baseLink: [axis, start],
			posts,
			connectors,
			box: { centre: [r.offsetX, r.offsetY, zBoxBottom + r.height / 2], size: [r.width, r.depth, r.height], rotation: r.rotation },
		});
	}
	return g;
}
