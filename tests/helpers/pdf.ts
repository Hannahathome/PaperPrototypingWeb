// Minimal PDF readers for tests: page size, and painted paths from content streams (jsPDF
// output, or Processing's Flate-compressed PDFs), converted to mm with the origin top-left.
import { inflateSync } from 'node:zlib';
import type { Segment } from './svg';

const PT_PER_MM = 72 / 25.4;

export function mediaBoxPt(pdf: string): number[] {
	const match = /\/MediaBox\s*\[([^\]]*)\]/.exec(pdf);
	if (!match) throw new Error('No /MediaBox in PDF');
	return match[1].trim().split(/\s+/).map(Number);
}

/** All content streams, inflated where compressed, concatenated. */
export function pdfContent(bytes: Buffer): string {
	const text = bytes.toString('latin1');
	const parts: string[] = [];
	const streams = /stream\r?\n/g;
	for (let m = streams.exec(text); m; m = streams.exec(text)) {
		const start = m.index + m[0].length;
		const end = text.indexOf('endstream', start);
		const data = bytes.subarray(start, end);
		try {
			parts.push(inflateSync(data).toString('latin1'));
		} catch {
			parts.push(data.toString('latin1'));
		}
	}
	return parts.join('\n');
}

export interface PaintedPath {
	paint: 'stroke' | 'fill';
	/** Subpaths as point lists in mm (closed subpaths repeat no point; see `closed`). */
	subpaths: { points: [number, number][]; closed: boolean }[];
	/** Fill (for fills) or stroke (for strokes) colour as RGB 0–1. */
	colour: [number, number, number];
}

/**
 * Paths painted with S/s (stroke) or f/f* (fill) in `content`. `ptPerMm` is the drawing
 * scale (72/25.4 for true PDF points; Processing's `MM` = 2.8346 for its exports) and
 * `pageHeightPt` the MediaBox height used to flip y. Curves keep only their end points.
 */
export function paintedPaths(content: string, pageHeightPt: number, ptPerMm = PT_PER_MM): PaintedPath[] {
	const toMm = (x: number, y: number): [number, number] => [x / ptPerMm, (pageHeightPt - y) / ptPerMm];
	const result: PaintedPath[] = [];
	let stack: number[] = [];
	let subpaths: PaintedPath['subpaths'] = [];
	let current: PaintedPath['subpaths'][number] | null = null;
	let fill: [number, number, number] = [0, 0, 0];
	let stroke: [number, number, number] = [0, 0, 0];
	const saved: [typeof fill, typeof stroke][] = [];
	const end = () => {
		subpaths = [];
		current = null;
	};
	for (const token of content.split(/\s+/)) {
		if (token === '') continue;
		if (/^-?(\d+\.?\d*|\.\d+)$/.test(token)) {
			stack.push(Number(token));
			continue;
		}
		const args = stack;
		stack = [];
		switch (token) {
			case 'm':
				current = { points: [toMm(args[0], args[1])], closed: false };
				subpaths.push(current);
				break;
			case 'l':
				current?.points.push(toMm(args[0], args[1]));
				break;
			case 'c':
				current?.points.push(toMm(args[4], args[5]));
				break;
			case 'v':
			case 'y':
				current?.points.push(toMm(args[2], args[3]));
				break;
			case 're': {
				const [x, y, w, h] = args;
				subpaths.push({ points: [toMm(x, y), toMm(x + w, y), toMm(x + w, y + h), toMm(x, y + h)], closed: true });
				current = null;
				break;
			}
			case 'h':
				if (current) current.closed = true;
				break;
			case 'S':
			case 's':
				if (token === 's' && current) current.closed = true;
				result.push({ paint: 'stroke', subpaths, colour: stroke });
				end();
				break;
			case 'f':
			case 'F':
			case 'f*':
				result.push({ paint: 'fill', subpaths, colour: fill });
				end();
				break;
			case 'n':
			case 'B':
			case 'B*':
			case 'b':
			case 'b*':
				end();
				break;
			case 'rg':
				fill = [args[0], args[1], args[2]];
				break;
			case 'RG':
				stroke = [args[0], args[1], args[2]];
				break;
			case 'g':
				fill = [args[0], args[0], args[0]];
				break;
			case 'G':
				stroke = [args[0], args[0], args[0]];
				break;
			case 'q':
				saved.push([fill, stroke]);
				break;
			case 'Q':
				[fill, stroke] = saved.pop() ?? [fill, stroke];
				break;
		}
	}
	return result;
}

/** Straight segments of all stroked paths. */
export function strokedSegments(paths: PaintedPath[]): Segment[] {
	return paths
		.filter((p) => p.paint === 'stroke')
		.flatMap((p) =>
			p.subpaths.flatMap(({ points, closed }) => {
				const segments: Segment[] = [];
				for (let i = 0; i + 1 < points.length; i++) segments.push([points[i], points[i + 1]]);
				if (closed && points.length > 2) segments.push([points[points.length - 1], points[0]]);
				return segments;
			}),
		);
}

/** Stroked segments of a jsPDF document (uncompressed output), in mm. */
export function strokedSegmentsMm(pdf: string): Segment[] {
	return strokedSegments(paintedPaths(pdf, mediaBoxPt(pdf)[3]));
}
