// Browser-only: draws textured triangles (page mm + image coordinates) onto a canvas at a
// given resolution, for the print layer (300 DPI, as Processing) and for previews.
import type { Point, RasterImage } from './drawing';
import { mmToPx } from './units';

export type TextureSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

export interface RasterTriangle {
	points: readonly [Point, Point, Point];
	uvs: readonly [readonly [number, number], readonly [number, number], readonly [number, number]];
	image: TextureSource;
}

/** Print resolution Processing renders textures at (TEXTURE_DPI). */
export const PRINT_DPI = 300;

function sizeOf(image: TextureSource): [number, number] {
	if ('naturalWidth' in image) return [image.naturalWidth, image.naturalHeight];
	return [image.width, image.height];
}

/** Affine map sending source points s0..s2 to destination points d0..d2, as canvas setTransform args. */
function affineFromTriangles(s: readonly Point[], d: readonly Point[]): [number, number, number, number, number, number] | null {
	const [[x0, y0], [x1, y1], [x2, y2]] = s;
	const det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
	if (Math.abs(det) < 1e-12) return null;
	const [[u0, v0], [u1, v1], [u2, v2]] = d;
	const a = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) / det;
	const c = ((u2 - u0) * (x1 - x0) - (u1 - u0) * (x2 - x0)) / det;
	const b = ((v1 - v0) * (y2 - y0) - (v2 - v0) * (y1 - y0)) / det;
	const dd = ((v2 - v0) * (x1 - x0) - (v1 - v0) * (x2 - x0)) / det;
	return [a, b, c, dd, u0 - a * x0 - c * y0, v0 - b * x0 - dd * y0];
}

/** Grow a triangle slightly around its centroid so neighbouring triangles overlap and no seams show. */
function grow(points: readonly Point[], by: number): Point[] {
	const cx = (points[0][0] + points[1][0] + points[2][0]) / 3;
	const cy = (points[0][1] + points[1][1] + points[2][1]) / 3;
	return points.map(([x, y]): Point => {
		const dx = x - cx;
		const dy = y - cy;
		const len = Math.hypot(dx, dy) || 1;
		return [x + (dx / len) * by, y + (dy / len) * by];
	});
}

export interface RasterResult {
	canvas: HTMLCanvasElement;
	/** Top-left of the canvas on the page, in mm. */
	at: Point;
	width: number;
	height: number;
}

/**
 * Rasterise triangles that fall within `bounds` (page mm) at `dpi`. Returns null when there
 * is nothing to draw. The background is white (paper) unless `transparent` is set.
 */
export function rasteriseTriangles(
	triangles: RasterTriangle[],
	bounds: { minX: number; minY: number; maxX: number; maxY: number },
	dpi: number,
	{ transparent = false }: { transparent?: boolean } = {},
): RasterResult | null {
	if (triangles.length === 0) return null;
	const width = bounds.maxX - bounds.minX;
	const height = bounds.maxY - bounds.minY;
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.ceil(mmToPx(width, dpi)));
	canvas.height = Math.max(1, Math.ceil(mmToPx(height, dpi)));
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas 2D is not available.');
	if (!transparent) {
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
	ctx.imageSmoothingQuality = 'high';

	const scale = mmToPx(1, dpi);
	const toCanvas = ([x, y]: Point): Point => [(x - bounds.minX) * scale, (y - bounds.minY) * scale];

	for (const triangle of triangles) {
		const [w, h] = sizeOf(triangle.image);
		const dest = triangle.points.map(toCanvas);
		const src = triangle.uvs.map(([u, v]): Point => [u * w, v * h]);
		const m = affineFromTriangles(src, dest);
		if (!m) continue;
		const clip = grow(dest, 0.6);
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(clip[0][0], clip[0][1]);
		ctx.lineTo(clip[1][0], clip[1][1]);
		ctx.lineTo(clip[2][0], clip[2][1]);
		ctx.closePath();
		ctx.clip();
		ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
		ctx.drawImage(triangle.image, 0, 0);
		ctx.restore();
	}
	return { canvas, at: [bounds.minX, bounds.minY], width, height };
}

/** The triangles' bounding box in mm, padded, or null for none. */
export function trianglesBounds(triangles: RasterTriangle[], pad = 1): { minX: number; minY: number; maxX: number; maxY: number } | null {
	if (triangles.length === 0) return null;
	const xs = triangles.flatMap((t) => t.points.map((p) => p[0]));
	const ys = triangles.flatMap((t) => t.points.map((p) => p[1]));
	return { minX: Math.min(...xs) - pad, minY: Math.min(...ys) - pad, maxX: Math.max(...xs) + pad, maxY: Math.max(...ys) + pad };
}

/** A rasterised layer as a sheet image. JPEG keeps 300 DPI pages small; paper is white anyway. */
export function toRasterImage(result: RasterResult, type: 'image/jpeg' | 'image/png' = 'image/jpeg'): RasterImage {
	return { dataUrl: result.canvas.toDataURL(type, 0.92), at: result.at, width: result.width, height: result.height };
}
