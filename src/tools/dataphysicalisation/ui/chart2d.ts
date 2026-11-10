// Flat 2D chart of bars in one row (DataPhysicalisation's 2D view), as an SVG string: each
// bar at its real width and height in mm, with its label and data value. Display only.
import type { Shape } from '../core/mapping';

const SLOT = 120;
const GAP = 20;

function escape(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const fmt = (v: number) => (Number.isFinite(v) ? (Math.abs(v) >= 100 ? v.toFixed(0) : Number(v.toPrecision(3)).toString()) : '—');

export function chartSvg(shapes: Shape[], heightColumn: string): string {
	const n = Math.max(shapes.length, 1);
	const width = n * (SLOT + GAP) - GAP;
	const maxH = Math.max(10, ...shapes.map((s) => s.height));
	// Text scales with the chart so it stays readable when many bars shrink the drawing.
	const text = Math.max(12, width / 70);
	const top = text * 2.5;
	const ground = top + maxH;
	const height = ground + text * 4.5;
	const parts: string[] = [
		`<line x1="0" y1="${ground}" x2="${width}" y2="${ground}" stroke="#777" stroke-width="1" vector-effect="non-scaling-stroke"/>`,
	];
	shapes.forEach((s, i) => {
		const cx = i * (SLOT + GAP) + SLOT / 2;
		parts.push(
			`<rect x="${cx - s.width / 2}" y="${ground - s.height}" width="${s.width}" height="${s.height}" fill="${s.colour}" stroke="#ccc" stroke-opacity="0.4" vector-effect="non-scaling-stroke"/>`,
			`<text x="${cx}" y="${ground - s.height - text * 0.5}" text-anchor="middle" font-size="${text * 0.9}" fill="currentColor">${escape(fmt(s.raw.height))}</text>`,
			`<text x="${cx}" y="${ground + text * 1.4}" text-anchor="middle" font-size="${text}" fill="currentColor">${escape(s.label)}</text>`,
			`<text x="${cx}" y="${ground + text * 2.8}" text-anchor="middle" font-size="${text * 0.8}" fill="currentColor" opacity="0.7">${s.height.toFixed(1)} × ${s.width.toFixed(1)} mm</text>`,
		);
	});
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 0 ${width + 20} ${height}" role="img" aria-label="Bar chart of ${escape(heightColumn)}">`,
		...parts,
		'</svg>',
	].join('\n');
}
