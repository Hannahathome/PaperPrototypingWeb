// Minimal SVG reader for tests: document size and straight segments from <line> and <path>.
export type Segment = [[number, number], [number, number]];

export interface ParsedSvg {
	width: string | null;
	height: string | null;
	viewBox: number[] | null;
	segments: Segment[];
}

function attr(tag: string, name: string): string | null {
	return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null;
}

function pathSegments(d: string): Segment[] {
	const segments: Segment[] = [];
	let start: [number, number] | null = null;
	let current: [number, number] | null = null;
	for (const [, command, args] of d.matchAll(/([MLZ])\s*([^MLZ]*)/gi)) {
		const numbers = args.trim() === '' ? [] : args.trim().split(/[\s,]+/).map(Number);
		const upper = command.toUpperCase();
		if (upper === 'Z') {
			if (current && start) segments.push([current, start]);
			current = start;
			continue;
		}
		for (let i = 0; i + 1 < numbers.length; i += 2) {
			const point: [number, number] = [numbers[i], numbers[i + 1]];
			if (upper === 'M' && i === 0) start = point;
			else if (current) segments.push([current, point]);
			current = point;
		}
	}
	return segments;
}

export function parseSvg(text: string): ParsedSvg {
	const svgTag = /<svg\b[^>]*>/.exec(text)?.[0] ?? '';
	const viewBox = attr(svgTag, 'viewBox');
	const segments: Segment[] = [];
	for (const [tag] of text.matchAll(/<line\b[^>]*>/g)) {
		const n = (name: string) => Number(attr(tag, name) ?? 0);
		segments.push([[n('x1'), n('y1')], [n('x2'), n('y2')]]);
	}
	for (const [tag] of text.matchAll(/<path\b[^>]*>/g)) {
		segments.push(...pathSegments(attr(tag, 'd') ?? ''));
	}
	return {
		width: attr(svgTag, 'width'),
		height: attr(svgTag, 'height'),
		viewBox: viewBox ? viewBox.split(/[\s,]+/).map(Number) : null,
		segments,
	};
}

/** Scale all segment coordinates by 1/pxPerMm. */
export function segmentsInMm(segments: Segment[], pxPerMm: number): Segment[] {
	return segments.map(([a, b]) => [
		[a[0] / pxPerMm, a[1] / pxPerMm],
		[b[0] / pxPerMm, b[1] / pxPerMm],
	]);
}

/**
 * True when every segment in `actual` matches one in `expected` (either direction) within
 * `tolerance` mm at both ends, and vice versa. Returns the unmatched segments for messages.
 */
export function unmatchedSegments(actual: Segment[], expected: Segment[], tolerance: number): { missing: Segment[]; extra: Segment[] } {
	const close = (p: [number, number], q: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= tolerance;
	const same = (s: Segment, t: Segment) => (close(s[0], t[0]) && close(s[1], t[1])) || (close(s[0], t[1]) && close(s[1], t[0]));
	return {
		missing: expected.filter((e) => !actual.some((a) => same(a, e))),
		extra: actual.filter((a) => !expected.some((e) => same(a, e))),
	};
}
