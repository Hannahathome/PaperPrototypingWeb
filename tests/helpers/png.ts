// Minimal PNG reader for tests: 8-bit greyscale, RGB, RGBA or palette, non-interlaced.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export interface Png {
	width: number;
	height: number;
	/** [r, g, b] at pixel (x, y). */
	rgb(x: number, y: number): [number, number, number];
}

export function readPng(file: string): Png {
	const bytes = readFileSync(file);
	let pos = 8;
	let width = 0;
	let height = 0;
	let type = 0;
	let palette: Buffer | null = null;
	const idat: Buffer[] = [];
	while (pos < bytes.length) {
		const length = bytes.readUInt32BE(pos);
		const chunk = bytes.toString('ascii', pos + 4, pos + 8);
		const data = bytes.subarray(pos + 8, pos + 8 + length);
		if (chunk === 'IHDR') {
			width = data.readUInt32BE(0);
			height = data.readUInt32BE(4);
			if (data[8] !== 8 || data[12] !== 0) throw new Error('Only 8-bit, non-interlaced PNGs are supported');
			type = data[9];
		} else if (chunk === 'PLTE') palette = data;
		else if (chunk === 'IDAT') idat.push(data);
		pos += 12 + length;
	}
	const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[type];
	const raw = inflateSync(Buffer.concat(idat));
	const stride = width * channels;
	const px = Buffer.alloc(height * stride);
	for (let y = 0; y < height; y++) {
		const filter = raw[y * (stride + 1)];
		for (let x = 0; x < stride; x++) {
			const a = x >= channels ? px[y * stride + x - channels] : 0;
			const b = y > 0 ? px[(y - 1) * stride + x] : 0;
			const c = x >= channels && y > 0 ? px[(y - 1) * stride + x - channels] : 0;
			let v = raw[y * (stride + 1) + 1 + x];
			if (filter === 1) v += a;
			else if (filter === 2) v += b;
			else if (filter === 3) v += (a + b) >> 1;
			else if (filter === 4) {
				const p = a + b - c;
				const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
				v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
			}
			px[y * stride + x] = v & 255;
		}
	}
	return {
		width,
		height,
		rgb(x, y) {
			const i = y * stride + x * channels;
			if (type === 3 && palette) return [palette[px[i] * 3], palette[px[i] * 3 + 1], palette[px[i] * 3 + 2]];
			if (type === 0 || type === 4) return [px[i], px[i], px[i]];
			return [px[i], px[i + 1], px[i + 2]];
		},
	};
}
