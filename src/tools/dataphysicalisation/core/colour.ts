// Processing's colour arithmetic, in 32-bit floats like the sketch, so exported hex colours
// match DataPhysicalisation exactly.
const f = Math.fround;

export type RGB = [r: number, g: number, b: number];

/** color(h, s, b) with colorMode(HSB, 360, 100, 100) (PGraphics.colorCalc). */
export function hsb(h: number, s: number, b: number): RGB {
	const x = f(Math.min(Math.max(f(h), 0), 360) / 360);
	const y = f(Math.min(Math.max(f(s), 0), 100) / 100);
	const z = f(Math.min(Math.max(f(b), 0), 100) / 100);
	let r: number;
	let g: number;
	let bl: number;
	if (y === 0) {
		r = g = bl = z;
	} else {
		const which = f((x - Math.trunc(x)) * 6);
		const frac = f(which - Math.trunc(which));
		const p = f(z * f(1 - y));
		const q = f(z * f(1 - f(y * frac)));
		const t = f(z * f(1 - f(y * f(1 - frac))));
		switch (Math.trunc(which)) {
			case 0:
				[r, g, bl] = [z, t, p];
				break;
			case 1:
				[r, g, bl] = [q, z, p];
				break;
			case 2:
				[r, g, bl] = [p, z, t];
				break;
			case 3:
				[r, g, bl] = [p, q, z];
				break;
			case 4:
				[r, g, bl] = [t, p, z];
				break;
			default:
				[r, g, bl] = [z, p, q];
		}
	}
	return [Math.trunc(f(255 * r)), Math.trunc(f(255 * g)), Math.trunc(f(255 * bl))];
}

/** lerpColor(c1, c2, amt) in RGB mode: each channel rounded with Processing's round(). */
export function lerpColour(a: RGB, b: RGB, amount: number): RGB {
	const t = f(amount);
	return a.map((v, i) => Math.floor(f(f(v + f(f(b[i] - v) * t)) + 0.5))) as RGB;
}

/** map(value, start1, stop1, start2, stop2) in float. */
export function pmap(value: number, start1: number, stop1: number, start2: number, stop2: number): number {
	return f(f(start2) + f(f(f(stop2) - f(start2)) * f(f(f(value) - f(start1)) / f(f(stop1) - f(start1)))));
}

export function toHex([r, g, b]: RGB): string {
	return `#${[r, g, b].map((v) => v.toString(16).toUpperCase().padStart(2, '0')).join('')}`;
}
