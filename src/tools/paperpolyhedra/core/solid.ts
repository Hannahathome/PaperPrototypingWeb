// The folded shape in 3D, for the preview: what the printed net actually folds into.
// Millimetres, z up, bottom rim at z = 0. Uses the folded height (not the entered height),
// so for frustums the preview shows Processing's panel-height behaviour honestly.
import { circumradius, type ShapeDims } from './params';

export type Vec3 = [x: number, y: number, z: number];

export interface Solid {
	/** Bottom rim corners, counter-clockwise seen from above. */
	bottom: Vec3[];
	/** Top rim corners, matching `bottom` index for index. */
	top: Vec3[];
	height: number;
}

export function foldedSolid(d: ShapeDims): Solid {
	const n = d.sides;
	const rb = circumradius(n, d.bottomSide);
	const rt = circumradius(n, d.topSide);
	const step = (2 * Math.PI) / n;
	// Panel 0 faces the viewer (−y); corners i and i+1 bound panel i.
	const start = -Math.PI / 2 - step / 2;
	const ring = (r: number, z: number): Vec3[] =>
		Array.from({ length: n }, (_, i): Vec3 => [r * Math.cos(start + i * step), r * Math.sin(start + i * step), z]);
	return { bottom: ring(rb, 0), top: ring(rt, d.foldedHeight), height: d.foldedHeight };
}
