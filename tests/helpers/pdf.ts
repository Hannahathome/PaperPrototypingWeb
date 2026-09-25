// Minimal reader for uncompressed jsPDF output: page size and stroked segments, in mm.
import type { Segment } from './svg';

const PT_TO_MM = 25.4 / 72;

export function mediaBoxPt(pdf: string): number[] {
	const match = /\/MediaBox\s*\[([^\]]*)\]/.exec(pdf);
	if (!match) throw new Error('No /MediaBox in PDF');
	return match[1].trim().split(/\s+/).map(Number);
}

/**
 * Straight segments built with the m (move), l (line) and h (close) operators, converted to
 * mm with the origin at the top left (PDF's origin is bottom left). Only handles the
 * operators jsPDF emits for straight paths.
 */
export function strokedSegmentsMm(pdf: string): Segment[] {
	const heightPt = mediaBoxPt(pdf)[3];
	const toMm = (x: number, y: number): [number, number] => [x * PT_TO_MM, (heightPt - y) * PT_TO_MM];
	const segments: Segment[] = [];
	let start: [number, number] | null = null;
	let current: [number, number] | null = null;
	for (const [, x, y, op] of pdf.matchAll(/(?:(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) ([ml])|\b(h))(?=\s)/g).map((m) => [m[0], m[1], m[2], m[3] ?? m[4]])) {
		if (op === 'h') {
			if (current && start) segments.push([current, start]);
			current = start;
			continue;
		}
		const point = toMm(Number(x), Number(y));
		if (op === 'm') start = point;
		else if (current) segments.push([current, point]);
		current = point;
	}
	return segments;
}
