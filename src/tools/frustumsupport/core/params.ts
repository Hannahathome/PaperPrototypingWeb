// FrustumSupport inputs, ported from FrustumSupport.pde. Frustum sizes are CIRCUMRADII
// (centre to corner), not the perimeters PaperPolyhedra uses. All values in mm / degrees.

export interface Rig {
	/** Electronics template name, or "Custom". Only used as a comment in the export. */
	template: string;
	width: number;
	depth: number;
	height: number;
	offsetX: number;
	offsetY: number;
	/** Height of the rig's base above the frame bottom (before Processing's −2 × edge radius). */
	offsetZ: number;
	/** Yaw about the rig's own offset point, degrees. */
	rotation: number;
}

export interface FrameInput {
	sides: number;
	bottomRadius: number;
	topRadius: number;
	height: number;
	/** Strut radius: the printed wireframe's thickness / 2. */
	edgeRadius: number;
	/** "ENABLE CUBOID RIG": cage with spokes and rigs, or the plain frustum frame. */
	rigsEnabled: boolean;
	rigs: Rig[];
	/** Two posts per rig face instead of one. */
	dualStruts: boolean;
	/** Gap between the two posts on each face (dual struts). */
	strutSpacing: number;
}

/** Wedge flap length written into every export; editable in OpenSCAD afterwards. */
export const FLAP_LENGTH = 8;

/** Electronics templates: width × depth × height in mm (FrustumSupport.pde templateWDH). */
export const RIG_TEMPLATES: Record<string, [number, number, number]> = {
	M5Atom: [24, 24, 31.5],
	M5Atom_lying: [24, 31.5, 24],
	M5Core: [54, 17, 54],
	M5Core_lying: [54, 54, 17],
	'M5Core+Ext': [54, 21, 54],
	'M5Core+Ext_lying': [54, 54, 21],
};

/** The template whose size matches the rig exactly, or "Custom" (Processing's dropdown label). */
export function templateFor(rig: Pick<Rig, 'width' | 'depth' | 'height'>): string {
	const found = Object.entries(RIG_TEMPLATES).find(([, [w, d, h]]) => w === rig.width && d === rig.depth && h === rig.height);
	return found ? found[0] : 'Custom';
}

/** Processing's defaults. */
export const DEFAULT_RIG: Rig = { template: 'M5Atom', width: 24, depth: 24, height: 31.5, offsetX: 0, offsetY: 0, offsetZ: 8.5, rotation: 0 };
export const DEFAULT_FRAME: FrameInput = {
	sides: 8,
	bottomRadius: 20,
	topRadius: 25,
	height: 40,
	edgeRadius: 1,
	rigsEnabled: true,
	rigs: [DEFAULT_RIG],
	dualStruts: false,
	strutSpacing: 15,
};

/** Clamp inputs the way FrustumSupport's number boxes do (minForIndex). */
export function normaliseFrame(input: FrameInput): FrameInput {
	const min0 = (v: number) => Math.max(0, v);
	return {
		...input,
		sides: Math.max(3, Math.trunc(input.sides)),
		bottomRadius: min0(input.bottomRadius),
		topRadius: min0(input.topRadius),
		height: min0(input.height),
		edgeRadius: min0(input.edgeRadius),
		strutSpacing: min0(input.strutSpacing),
		rigs: input.rigs.map((rig) => ({
			...rig,
			width: min0(rig.width),
			depth: min0(rig.depth),
			height: min0(rig.height),
			offsetZ: min0(rig.offsetZ),
		})),
	};
}
