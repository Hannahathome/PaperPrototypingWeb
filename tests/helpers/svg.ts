// Minimal SVG reader for tests: document size and straight segments from <line> and <path>,
// with nested <g transform="…"> and element transforms applied (as Batik, Processing's SVG
// writer, emits them).
export type Segment = [[number, number], [number, number]];

export interface ParsedSvg {
	width: string | null;
	height: string | null;
	viewBox: number[] | null;
	segments: Segment[];
}

/** Affine matrix [a, b, c, d, e, f]: x' = a·x + c·y + e, y' = b·x + d·y + f. */
type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(m: Matrix, n: Matrix): Matrix {
	return [
		m[0] * n[0] + m[2] * n[1],
		m[1] * n[0] + m[3] * n[1],
		m[0] * n[2] + m[2] * n[3],
		m[1] * n[2] + m[3] * n[3],
		m[0] * n[4] + m[2] * n[5] + m[4],
		m[1] * n[4] + m[3] * n[5] + m[5],
	];
}

function applyMatrix(m: Matrix, [x, y]: [number, number]): [number, number] {
	return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

function parseTransform(text: string | null): Matrix {
	let result = IDENTITY;
	if (!text) return result;
	for (const [, name, args] of text.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
		const v = args.trim().split(/[\s,]+/).map(Number);
		let m: Matrix;
		switch (name) {
			case 'matrix':
				m = v as Matrix;
				break;
			case 'translate':
				m = [1, 0, 0, 1, v[0], v[1] ?? 0];
				break;
			case 'scale':
				m = [v[0], 0, 0, v[1] ?? v[0], 0, 0];
				break;
			case 'rotate': {
				const a = (v[0] * Math.PI) / 180;
				const r: Matrix = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
				m = v.length === 3 ? multiply(multiply([1, 0, 0, 1, v[1], v[2]], r), [1, 0, 0, 1, -v[1], -v[2]]) : r;
				break;
			}
			default:
				throw new Error(`Unsupported SVG transform: ${name}`);
		}
		result = multiply(result, m);
	}
	return result;
}

function attr(tag: string, name: string): string | null {
	return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null;
}

function pathSegments(d: string): Segment[] {
	const segments: Segment[] = [];
	let start: [number, number] | null = null;
	let current: [number, number] | null = null;
	for (const [, command, args] of d.matchAll(/([MLZ])\s*([^MLZ]*)/gi)) {
		if (command !== command.toUpperCase()) throw new Error(`Relative path command ${command} not supported`);
		const numbers = args.trim() === '' ? [] : args.trim().split(/[\s,]+/).map(Number);
		if (command === 'Z') {
			if (current && start) segments.push([current, start]);
			current = start;
			continue;
		}
		for (let i = 0; i + 1 < numbers.length; i += 2) {
			const point: [number, number] = [numbers[i], numbers[i + 1]];
			if (command === 'M' && i === 0) start = point;
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
	const stack: Matrix[] = [IDENTITY];
	const current = () => stack[stack.length - 1];

	for (const [, closing, name, rest] of text.matchAll(/<(\/?)([a-zA-Z]+)\b([^>]*)>/g)) {
		const selfClosing = rest.trimEnd().endsWith('/');
		if (name === 'g') {
			if (closing) stack.pop();
			else if (!selfClosing) stack.push(multiply(current(), parseTransform(attr(rest, 'transform'))));
			continue;
		}
		if (closing) continue;
		const m = multiply(current(), parseTransform(attr(rest, 'transform')));
		const local: Segment[] = [];
		if (name === 'line') {
			const n = (key: string) => Number(attr(rest, key) ?? 0);
			local.push([[n('x1'), n('y1')], [n('x2'), n('y2')]]);
		} else if (name === 'path') {
			local.push(...pathSegments(attr(rest, 'd') ?? ''));
		}
		for (const [a, b] of local) segments.push([applyMatrix(m, a), applyMatrix(m, b)]);
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

/** Drop segments shorter than `min` (Processing repeats vertices, giving zero-length segments). */
export function withoutDegenerate(segments: Segment[], min = 1e-6): Segment[] {
	return segments.filter(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]) >= min);
}

/**
 * Segments in `expected` with no match in `actual` (`missing`) and vice versa (`extra`).
 * Two segments match when both ends are within `tolerance` mm, in either direction.
 */
export function unmatchedSegments(actual: Segment[], expected: Segment[], tolerance: number): { missing: Segment[]; extra: Segment[] } {
	const close = (p: [number, number], q: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= tolerance;
	const same = (s: Segment, t: Segment) => (close(s[0], t[0]) && close(s[1], t[1])) || (close(s[0], t[1]) && close(s[1], t[0]));
	return {
		missing: expected.filter((e) => !actual.some((a) => same(a, e))),
		extra: actual.filter((a) => !expected.some((e) => same(a, e))),
	};
}
