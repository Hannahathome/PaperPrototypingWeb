// Colour and images on the net, as PaperPolyhedra prints them (texturesnew.pde
// drawTexturesForPrinting, textures_triangles.pde, color_fill.pde). Pure geometry: textured
// triangles in page mm with image coordinates, which the UI rasterises. All mappings follow
// Processing, including its orientation: image row 0 lands on the model's bottom rim, which
// is the top edge of the strip on the page.
import type { Path, Point } from '../../../lib/drawing';
import type { Lid, Net, Panel } from './net';

/** Which image a triangle samples. */
export type ImageSlot = { kind: 'panel'; index: number } | { kind: 'strip' } | { kind: 'topLid' } | { kind: 'bottomLid' };

/** Image coordinates: u across, v down, both 0–1 over the whole image. */
export type UV = readonly [u: number, v: number];

export interface TexturedTriangle {
	slot: ImageSlot;
	points: [Point, Point, Point];
	uvs: [UV, UV, UV];
}

export type SideMode = 'none' | 'perPanel' | 'strip';

export interface ArtworkOptions {
	/** Solid fill for the panels and lids (CSS hex). Printed over any images, as in Processing. */
	fill?: string | null;
	sideMode: SideMode;
	/** perPanel: which panels have an image (index = panel number). */
	panelImages?: boolean[];
	/**
	 * Lid images and their aspect ratio (width / height). Processing prints lid images only
	 * together with a per-panel or strip image, never on their own.
	 */
	topLidAspect?: number | null;
	bottomLidAspect?: number | null;
}

/** Processing's tessellation density (uiTessDensity); the strip uses half of it. */
export const TESSELLATION_DENSITY = 16;
export const STRIP_DENSITY = Math.max(2, TESSELLATION_DENSITY / 2);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Bilinear point in a panel: u along the edges (left → right), v from bottom rim to top rim. */
function panelPoint({ corners: [bl, br, tr, tl] }: Panel, u: number, v: number): Point {
	const bottom: Point = [lerp(bl[0], br[0], u), lerp(bl[1], br[1], u)];
	const top: Point = [lerp(tl[0], tr[0], u), lerp(tl[1], tr[1], u)];
	return [lerp(bottom[0], top[0], v), lerp(bottom[1], top[1], v)];
}

/**
 * One image per panel, as two triangles split along the top-right/bottom-left diagonal
 * (drawPerPanelTexturesUniform): image top-left on the panel's bottom-left corner.
 */
export function perPanelTriangles(panels: Panel[], hasImage: boolean[]): TexturedTriangle[] {
	return panels.flatMap((panel, index): TexturedTriangle[] => {
		if (!hasImage[index]) return [];
		const [bl, br, tr, tl] = panel.corners;
		const slot: ImageSlot = { kind: 'panel', index };
		return [
			{ slot, points: [tl, tr, bl], uvs: [[0, 1], [1, 1], [0, 0]] },
			{ slot, points: [tr, br, bl], uvs: [[1, 1], [1, 0], [0, 0]] },
		];
	});
}

/**
 * One image across the whole strip (drawTriangleStripTexture_Uniform): each panel gets an
 * equal share of the image width, tessellated STRIP_DENSITY × STRIP_DENSITY.
 */
export function stripTriangles(panels: Panel[]): TexturedTriangle[] {
	const n = panels.length;
	const d = STRIP_DENSITY;
	const slot: ImageSlot = { kind: 'strip' };
	const triangles: TexturedTriangle[] = [];
	panels.forEach((panel, i) => {
		const u0 = i / n;
		const u1 = (i + 1) / n;
		for (let row = 0; row < d; row++) {
			for (let col = 0; col < d; col++) {
				const [a0, a1, b0, b1] = [col / d, (col + 1) / d, row / d, (row + 1) / d];
				const p00 = panelPoint(panel, a0, b0);
				const p10 = panelPoint(panel, a1, b0);
				const p01 = panelPoint(panel, a0, b1);
				const p11 = panelPoint(panel, a1, b1);
				const uv = (a: number, b: number): UV => [lerp(u0, u1, a), b];
				triangles.push({ slot, points: [p00, p10, p01], uvs: [uv(a0, b0), uv(a1, b0), uv(a0, b1)] });
				triangles.push({ slot, points: [p10, p11, p01], uvs: [uv(a1, b0), uv(a1, b1), uv(a0, b1)] });
			}
		}
	});
	return triangles;
}

/**
 * A lid image (drawTessellatedPolygonLidToPG): the disc inscribed in the image, drawn as a
 * disc of the lid's circumradius around the lid centre, starting at angle 0. It covers the
 * whole lid; the overflow lands on tabs or on paper that is cut away.
 */
export function lidTriangles(lid: Lid, aspect: number, slot: ImageSlot, density = TESSELLATION_DENSITY): TexturedTriangle[] {
	const n = lid.corners.length;
	const radius = Math.hypot(lid.corners[0][0] - lid.centre[0], lid.corners[0][1] - lid.centre[1]);
	const step = (2 * Math.PI) / n;
	// Radius of the inscribed disc in image units: min(width, height) / 2 over width and height.
	const su = Math.min(1, 1 / aspect) / 2;
	const sv = Math.min(1, aspect) / 2;
	const at = (angle: number, r: number): { p: Point; uv: UV } => ({
		p: [lid.centre[0] + Math.cos(angle) * r * radius, lid.centre[1] + Math.sin(angle) * r * radius],
		uv: [0.5 + Math.cos(angle) * r * su, 0.5 + Math.sin(angle) * r * sv],
	});
	const triangles: TexturedTriangle[] = [];
	for (let side = 0; side < n; side++) {
		for (let ring = 0; ring < density; ring++) {
			const [r0, r1] = [ring / density, (ring + 1) / density];
			for (let arc = 0; arc < density; arc++) {
				const a0 = lerp(side * step, (side + 1) * step, arc / density);
				const a1 = lerp(side * step, (side + 1) * step, (arc + 1) / density);
				const [v00, v10, v01, v11] = [at(a0, r0), at(a1, r0), at(a0, r1), at(a1, r1)];
				triangles.push({ slot, points: [v00.p, v10.p, v01.p], uvs: [v00.uv, v10.uv, v01.uv] });
				triangles.push({ slot, points: [v10.p, v11.p, v01.p], uvs: [v10.uv, v11.uv, v01.uv] });
			}
		}
	}
	return triangles;
}

/** Filled print paths for the panels and lids (drawSolidColorPanels, drawSolidColorLid). */
export function fillPaths(net: Net, colour: string): Path[] {
	return [
		...net.panels.map((panel): Path => ({ kind: 'print', closed: true, fill: colour, points: [...panel.corners] })),
		...[net.bottomLid, net.topLid].map((lid): Path => ({ kind: 'print', closed: true, fill: colour, points: [...lid.corners] })),
	];
}

export interface Artwork {
	fills: Path[];
	triangles: TexturedTriangle[];
}

export function buildArtwork(net: Net, options: ArtworkOptions): Artwork {
	const triangles: TexturedTriangle[] = [];
	if (options.sideMode === 'perPanel') triangles.push(...perPanelTriangles(net.panels, options.panelImages ?? []));
	if (options.sideMode === 'strip') triangles.push(...stripTriangles(net.panels));
	if (options.sideMode !== 'none') {
		if (options.bottomLidAspect) triangles.push(...lidTriangles(net.bottomLid, options.bottomLidAspect, { kind: 'bottomLid' }));
		if (options.topLidAspect) triangles.push(...lidTriangles(net.topLid, options.topLidAspect, { kind: 'topLid' }));
	}
	return { fills: options.fill ? fillPaths(net, options.fill) : [], triangles };
}
