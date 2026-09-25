// Number formatting that reproduces Java's `"" + floatValue` (Float.toString) as Processing 4.3
// (Java 17) writes it into OpenSCAD files, so web exports match Processing's text exactly.
//
// Java 17's Float.toString is not "shortest round-trip": it runs FloatingDecimal.dtoa, which
// sometimes prints an extra digit or breaks ties differently. This is a port of that
// algorithm (java.base jdk.internal.math.FloatingDecimal, JDK 17), including its 32/64-bit
// integer overflow behaviour, emulated with BigInt. Checked against 5000 values printed by
// Java 17 in tests/lib/java-format.test.ts.

const EXP_SHIFT = 52;
const FRACT_HOB = 1n << 52n;
const MAX_SMALL_BIN_EXP = 62;
const MIN_SMALL_BIN_EXP = -21; // -(63 / 3)
const N_5_BITS = [0, 3, 5, 7, 10, 12, 14, 17, 19, 21, 24, 26, 28, 31, 33, 35, 38, 40, 42, 45, 47, 49, 52, 54, 56, 59, 61];
const LONG_5_POW_LENGTH = 27;
const INSIGNIFICANT_DIGITS = [
	0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12, 12, 13,
	13, 13, 14, 14, 14, 15, 15, 15, 15, 16, 16, 16, 17, 17, 17, 18, 18, 18, 19,
];

const pow5 = (n: number) => 5n ** BigInt(n);
const int32 = (x: bigint) => BigInt.asIntN(32, x);
const int64 = (x: bigint) => BigInt.asIntN(64, x);

function trailingZeros(x: bigint): number {
	let n = 0;
	while ((x & 1n) === 0n) {
		x >>= 1n;
		n++;
	}
	return n;
}

/** floor(log10(d)) estimate, computed exactly as FloatingDecimal.estimateDecExp does. */
function estimateDecExp(fractBits: bigint, binExp: number): number {
	const d2 = 1 + Number(fractBits & (FRACT_HOB - 1n)) / 2 ** 52;
	const d = (d2 - 1.5) * 0.289529654 + 0.176091259 + binExp * 0.301029995663981;
	return Math.floor(d);
}

interface Digits {
	digits: number[];
	decExponent: number;
}

function roundUp(r: Digits): void {
	const d = r.digits;
	let i = d.length - 1;
	while (d[i] === 9 && i > 0) {
		d[i] = 0;
		i--;
	}
	if (d[i] === 9) {
		// Carry out: high-order 1, rest zeros, larger exponent.
		r.decExponent += 1;
		d[0] = 1;
		return;
	}
	d[i] += 1;
}

/** FloatingDecimal.developLongDigits. */
function developLongDigits(decExponent: number, lvalue: bigint, insignificant: number): Digits {
	if (insignificant !== 0) {
		const pow10 = 10n ** BigInt(insignificant);
		const residue = lvalue % pow10;
		lvalue /= pow10;
		decExponent += insignificant;
		if (residue >= pow10 >> 1n) lvalue++;
	}
	const reversed: number[] = [];
	let c = Number(lvalue % 10n);
	lvalue /= 10n;
	while (c === 0) {
		decExponent++;
		c = Number(lvalue % 10n);
		lvalue /= 10n;
	}
	while (lvalue !== 0n) {
		reversed.push(c);
		decExponent++;
		c = Number(lvalue % 10n);
		lvalue /= 10n;
	}
	reversed.push(c);
	return { digits: reversed.reverse(), decExponent: decExponent + 1 };
}

/** FloatingDecimal.BinaryToASCIIBuffer.dtoa with isCompatibleFormat = true. */
function dtoa(binExp: number, fractBits: bigint, nSignificantBits: number): Digits {
	const tailZeros = trailingZeros(fractBits);
	const nFractBits = EXP_SHIFT + 1 - tailZeros;
	const nTinyBits = Math.max(0, nFractBits - binExp - 1);

	if (binExp <= MAX_SMALL_BIN_EXP && binExp >= MIN_SMALL_BIN_EXP) {
		if (nTinyBits < LONG_5_POW_LENGTH && nFractBits + N_5_BITS[nTinyBits] < 64 && nTinyBits === 0) {
			const insignificant = binExp > nSignificantBits ? insignificantDigitsForPow2(binExp - nSignificantBits - 1) : 0;
			const value = binExp >= EXP_SHIFT ? fractBits << BigInt(binExp - EXP_SHIFT) : fractBits >> BigInt(EXP_SHIFT - binExp);
			return developLongDigits(0, value, insignificant);
		}
	}

	let decExp = estimateDecExp(fractBits, binExp);
	const B5 = Math.max(0, -decExp);
	let B2 = B5 + nTinyBits + binExp;
	const S5 = Math.max(0, decExp);
	let S2 = S5 + nTinyBits;
	const M5 = B5;
	let M2 = B2 - nSignificantBits;

	fractBits >>= BigInt(tailZeros);
	B2 -= nFractBits - 1;
	const common2 = Math.min(B2, S2);
	B2 -= common2;
	S2 -= common2;
	M2 -= common2;
	if (nFractBits === 1) M2 -= 1;
	if (M2 < 0) {
		B2 -= M2;
		S2 -= M2;
		M2 = 0;
	}

	const digits: number[] = [];
	let low: boolean;
	let high: boolean;
	let lowDigitDifference: bigint;
	const bBits = nFractBits + B2 + (B5 < N_5_BITS.length ? N_5_BITS[B5] : B5 * 3);
	const tenSBits = S2 + 1 + (S5 + 1 < N_5_BITS.length ? N_5_BITS[S5 + 1] : (S5 + 1) * 3);
	const eForm = () => decExp < -3 || decExp >= 8;

	if (bBits < 64 && tenSBits < 64) {
		// Java int (32-bit) or long (64-bit) arithmetic, with wraparound.
		const wrap = bBits < 32 && tenSBits < 32 ? int32 : int64;
		let b = wrap(wrap((wrap === int32 ? int32(fractBits) : fractBits) * pow5(B5)) << BigInt(B2));
		const s = wrap(pow5(S5) << BigInt(S2));
		let m = wrap(pow5(M5) << BigInt(M2));
		const tens = wrap(s * 10n);

		let q = b / s;
		b = wrap(10n * (b % s));
		m = wrap(m * 10n);
		low = b < m;
		high = wrap(b + m) > tens;
		if (q === 0n && !high) decExp--;
		else digits.push(Number(q));
		if (eForm()) high = low = false;
		while (!low && !high) {
			q = b / s;
			b = wrap(10n * (b % s));
			m = wrap(m * 10n);
			if (m > 0n) {
				low = b < m;
				high = wrap(b + m) > tens;
			} else {
				low = true;
				high = true;
			}
			digits.push(Number(q));
		}
		lowDigitDifference = wrap(wrap(b << 1n) - tens);
	} else {
		// FDBigInteger arithmetic (exact); the common normalisation shift cancels out.
		const S = pow5(S5) << BigInt(S2);
		let B = (fractBits * pow5(B5)) << BigInt(B2);
		let M = pow5(M5 + 1) << BigInt(M2 + 1);
		const tenS = pow5(S5 + 1) << BigInt(S2 + 1);

		let q = B / S;
		B = 10n * (B % S);
		low = B < M;
		high = B + M >= tenS;
		if (q === 0n && !high) decExp--;
		else digits.push(Number(q));
		if (eForm()) high = low = false;
		while (!low && !high) {
			q = B / S;
			B = 10n * (B % S);
			M *= 10n;
			low = B < M;
			high = B + M >= tenS;
			digits.push(Number(q));
		}
		if (high && low) {
			B <<= 1n;
			lowDigitDifference = B < tenS ? -1n : B > tenS ? 1n : 0n;
		} else {
			lowDigitDifference = 0n;
		}
	}

	const result: Digits = { digits, decExponent: decExp + 1 };
	if (high) {
		if (low) {
			if (lowDigitDifference === 0n) {
				if ((digits[digits.length - 1] & 1) !== 0) roundUp(result);
			} else if (lowDigitDifference > 0n) {
				roundUp(result);
			}
		} else {
			roundUp(result);
		}
	}
	return result;
}

function insignificantDigitsForPow2(p2: number): number {
	return p2 > 1 && p2 < INSIGNIFICANT_DIGITS.length ? INSIGNIFICANT_DIGITS[p2] : 0;
}

/** BinaryToASCIIBuffer.getChars: Java's plain or computerised scientific layout. */
function layout(negative: boolean, { digits, decExponent }: Digits): string {
	const d = digits.join('');
	const n = digits.length;
	let out = negative ? '-' : '';
	if (decExponent > 0 && decExponent < 8) {
		const whole = Math.min(n, decExponent);
		out += d.slice(0, whole);
		if (whole < decExponent) out += `${'0'.repeat(decExponent - whole)}.0`;
		else out += `.${whole < n ? d.slice(whole) : '0'}`;
	} else if (decExponent <= 0 && decExponent > -3) {
		out += `0.${'0'.repeat(-decExponent)}${d}`;
	} else {
		out += `${d[0]}.${n > 1 ? d.slice(1) : '0'}E${decExponent <= 0 ? `-${-decExponent + 1}` : decExponent - 1}`;
	}
	return out;
}

/** Java 17's Float.toString, e.g. 8 → "8.0", 20.3 → "20.3", 0.0001 → "1.0E-4". */
export function javaFloatString(value: number): string {
	const view = new DataView(new ArrayBuffer(4));
	view.setFloat32(0, value);
	const bits = view.getUint32(0);
	const negative = bits >>> 31 === 1;
	let fract = bits & 0x7fffff;
	let binExp = (bits >>> 23) & 0xff;

	if (binExp === 0xff) return fract === 0 ? (negative ? '-Infinity' : 'Infinity') : 'NaN';
	let nSignificantBits: number;
	if (binExp === 0) {
		if (fract === 0) return negative ? '-0.0' : '0.0';
		const leadingZeros = Math.clz32(fract);
		const shift = leadingZeros - (31 - 23);
		fract <<= shift;
		binExp = 1 - shift;
		nSignificantBits = 32 - leadingZeros;
	} else {
		fract |= 1 << 23;
		nSignificantBits = 24;
	}
	binExp -= 127;
	return layout(negative, dtoa(binExp, BigInt(fract) << BigInt(EXP_SHIFT - 23), nSignificantBits));
}

/** Java's `"" + intValue`. */
export function javaIntString(value: number): string {
	return String(Math.trunc(value));
}
