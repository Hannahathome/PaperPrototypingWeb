// The drawing model every tool core returns: a sheet of paths and labels in millimetres,
// origin top-left, y pointing down (the same orientation as SVG and the Processing sketches).

export type Point = readonly [x: number, y: number];

/**
 * What a path is for:
 * - `cut`: cut through by the cutter; also drawn on the print so you can see it.
 * - `fold`: scored by the cutter as short dashes; also drawn on the print.
 * - `print`: ink only, never sent to the cutter.
 */
export type PathKind = 'cut' | 'fold' | 'print';

export interface Path {
	kind: PathKind;
	points: Point[];
	/** Join the last point back to the first. */
	closed?: boolean;
	/** Fill colour for `print` paths (CSS hex, e.g. "#e0e0e0"). Cut and fold paths are never filled. */
	fill?: string;
}

/** Printed text. Never sent to the cutter. */
export interface Label {
	text: string;
	/** Position of the text's left end on its baseline, in mm. */
	at: Point;
	/** Text height in mm. */
	size: number;
}

/** Raster artwork placed on the print. Never sent to the cutter. */
export interface RasterImage {
	/** PNG or JPEG data URL. */
	dataUrl: string;
	/** Top-left corner in mm. */
	at: Point;
	width: number;
	height: number;
}

export interface Sheet {
	paths: Path[];
	labels?: Label[];
	/** Drawn first, underneath the paths. */
	images?: RasterImage[];
}

/**
 * Fold-line dash pattern in mm. Processing draws folds with `dash = gap = 3 mm` scaled by
 * `FOLD_DASH_SCALE = 0.4`.
 */
export const FOLD_DASH = 1.2;
export const FOLD_GAP = 1.2;

/**
 * Split a straight line into dashes, exactly as Processing's `drawDashedLine` does:
 * a gap at both ends, dashes of `dash` separated by `gap`, and the last dash shortened so
 * it never enters the final gap. Lines no longer than two gaps produce nothing.
 */
export function dashSegments(a: Point, b: Point, dash: number = FOLD_DASH, gap: number = FOLD_GAP): [Point, Point][] {
	const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
	if (length <= 2 * gap) return [];
	const dx = (b[0] - a[0]) / length;
	const dy = (b[1] - a[1]) / length;
	const at = (s: number): Point => [a[0] + dx * s, a[1] + dy * s];

	const dashes: [Point, Point][] = [];
	for (let pos = gap; pos < length - gap; pos += dash + gap) {
		dashes.push([at(pos), at(Math.min(pos + dash, length - gap))]);
	}
	return dashes;
}

/** The straight segments of a path, including the closing segment of a closed path. */
export function segmentsOf(path: Path): [Point, Point][] {
	const { points } = path;
	const segments: [Point, Point][] = [];
	for (let i = 0; i + 1 < points.length; i++) segments.push([points[i], points[i + 1]]);
	if (path.closed && points.length > 2) segments.push([points[points.length - 1], points[0]]);
	return segments;
}

/**
 * The cutter's view of a set of paths: cut paths unchanged, each straight segment of a fold
 * path replaced by its dashes, print paths dropped. Cutter software ignores
 * `stroke-dasharray`, so fold dashes must be real segments.
 */
export function toCutterPaths(paths: Path[]): Path[] {
	return paths.flatMap((path): Path[] => {
		switch (path.kind) {
			case 'cut':
				return [path];
			case 'fold':
				return segmentsOf(path).flatMap(([a, b]) =>
					dashSegments(a, b).map(([p, q]): Path => ({ kind: 'fold', points: [p, q] })),
				);
			case 'print':
				return [];
		}
	});
}

/** Axis-aligned bounds of all path points, or null for an empty list. */
export function boundsOf(paths: Path[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
	const points = paths.flatMap((path) => path.points);
	if (points.length === 0) return null;
	return {
		minX: Math.min(...points.map((p) => p[0])),
		minY: Math.min(...points.map((p) => p[1])),
		maxX: Math.max(...points.map((p) => p[0])),
		maxY: Math.max(...points.map((p) => p[1])),
	};
}
