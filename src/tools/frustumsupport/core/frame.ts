// Frame geometry for the 3D preview, ported from FrustumSupport.pde calculateGeometry() and
// buildRigGeometry(), which mirror the OpenSCAD modules (frustumCage / frustum, rigSupport).
// Millimetres, z up, the frame centred on z = 0 like OpenSCAD's. Every strut is a segment
// drawn with the edge radius; the preview does not model the wedge flaps or the top trim.
import { normaliseFrame, type FrameInput } from './params';

export type Vec3 = [x: number, y: number, z: number];
export type Segment = [Vec3, Vec3];

export interface RigGeometry {
	spine: Segment;
	baseLink: Segment;
	posts: Segment[];
	connectors: Segment[];
	/** Reference box: centre, size and yaw in degrees. */
	box: { centre: Vec3; size: Vec3; rotation: number };
}

export interface FrameGeometry {
	/** Strut radius. */
	radius: number;
	bottom: Vec3[];
	top: Vec3[];
	/** Bottom ring edges and the vertical wall struts. */
	struts: Segment[];
	/** Spokes from each bottom edge's midpoint to the centre (rigs only). */
	spokes: Segment[];
	rigs: RigGeometry[];
	zBottom: number;
	zTop: number;
}

export function frameGeometry(raw: FrameInput): FrameGeometry {
	const input = normaliseFrame(raw);
	const n = input.sides;
	const e = input.edgeRadius;
	const rb = input.bottomRadius - e;
	const rt = input.topRadius - e;
	const h = input.height - 2 * e;
	const zBottom = -h / 2;

	// Vertex 0 at angle 0 (OpenSCAD's convention; PaperPolyhedra differs by −90 − 180/n).
	const ring = (r: number, z: number): Vec3[] =>
		Array.from({ length: n }, (_, i): Vec3 => {
			const a = (i * 2 * Math.PI) / n;
			return [r * Math.cos(a), r * Math.sin(a), z];
		});
	const bottom = ring(rb, zBottom);
	const top = ring(rt, h / 2);
	const struts: Segment[] = [];
	for (let i = 0; i < n; i++) {
		struts.push([bottom[i], bottom[(i + 1) % n]], [bottom[i], top[i]]);
	}

	const spokes: Segment[] = [];
	const rigs: RigGeometry[] = [];
	let zTop = h / 2;
	if (input.rigsEnabled) {
		const centre: Vec3 = [0, 0, zBottom];
		for (let i = 0; i < n; i++) {
			const [p, q] = [bottom[i], bottom[(i + 1) % n]];
			spokes.push([[(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, zBottom], centre]);
		}
		for (const rig of input.rigs) {
			const hx = rig.width / 2;
			const hy = rig.depth / 2;
			const zBoxBottom = zBottom + rig.offsetZ - e * 2;
			const zBoxTop = zBoxBottom + rig.height;
			zTop = Math.max(zTop, zBoxTop);
			const start: Vec3 = [rig.offsetX, rig.offsetY, zBottom];
			const half = input.strutSpacing / 2;
			const locals: [number, number][] = input.dualStruts
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
			const a = (rig.rotation * Math.PI) / 180;
			const posts: Segment[] = [];
			const connectors: Segment[] = [];
			for (const [lx, ly] of locals) {
				const x = rig.offsetX + lx * Math.cos(a) - ly * Math.sin(a);
				const y = rig.offsetY + lx * Math.sin(a) + ly * Math.cos(a);
				posts.push([
					[x, y, zBottom],
					[x, y, zBoxTop],
				]);
				connectors.push([start, [x, y, zBottom]]);
			}
			rigs.push({
				spine: [start, [rig.offsetX, rig.offsetY, zBoxBottom]],
				baseLink: [centre, start],
				posts,
				connectors,
				box: { centre: [rig.offsetX, rig.offsetY, zBoxBottom + rig.height / 2], size: [rig.width, rig.depth, rig.height], rotation: rig.rotation },
			});
		}
	}
	return { radius: e, bottom, top, struts, spokes, rigs, zBottom, zTop };
}
