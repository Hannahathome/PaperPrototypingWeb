// SVG output in physical millimetres: width/height carry "mm" and the viewBox is in mm, so
// one user unit is exactly one millimetre and cutter software cannot guess the DPI wrong.
import type { Path } from './drawing';

/** Line width for cut and fold lines: 0.5 px at 96 DPI, as Processing's cut files use. */
export const CUT_STROKE_MM = (0.5 * 25.4) / 96;

/** Format a millimetre value: at most 4 decimals (0.1 µm), no trailing zeros, no "-0". */
export function fmt(value: number): string {
	const rounded = Number(value.toFixed(4));
	return Object.is(rounded, -0) ? '0' : String(rounded);
}

export function pathData(path: Path): string {
	const [first, ...rest] = path.points;
	if (!first) return '';
	const moves = [`M${fmt(first[0])} ${fmt(first[1])}`, ...rest.map((p) => `L${fmt(p[0])} ${fmt(p[1])}`)];
	if (path.closed) moves.push('Z');
	return moves.join(' ');
}

export interface SvgOptions {
	/** Document size in mm. */
	width: number;
	height: number;
	strokeWidth?: number;
}

/**
 * A cutter SVG: every path is stroked black with no fill. Pass cutter paths
 * (see `toCutterPaths`), not a whole sheet.
 */
export function toSvg(paths: Path[], { width, height, strokeWidth = CUT_STROKE_MM }: SvgOptions): string {
	const body = paths
		.filter((path) => path.points.length > 1)
		.map((path) => `  <path d="${pathData(path)}"/>`)
		.join('\n');
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		`<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}mm" height="${fmt(height)}mm" viewBox="0 0 ${fmt(width)} ${fmt(height)}">`,
		`<g fill="none" stroke="#000" stroke-width="${fmt(strokeWidth)}" stroke-linecap="butt" stroke-linejoin="miter">`,
		body,
		'</g>',
		'</svg>',
		'',
	].join('\n');
}
