// Units and page sizes. All geometry in this project is in millimetres; this is the only
// place where millimetres are converted to anything else.

export const MM_PER_INCH = 25.4;

/** A4 landscape, the printed page. */
export const A4_LANDSCAPE = { width: 297, height: 210 } as const;

/**
 * Usable vinyl-cutter area on an A4 sheet. Smaller than the page because the cutter needs
 * margin to grip the sheet. Shares its top-left origin with the printed page.
 */
export const CUT_AREA = { width: 280, height: 200 } as const;

/** Millimetres to pixels (or PDF points, at 72 DPI) at a given resolution. */
export function mmToPx(mm: number, dpi: number): number {
	return (mm / MM_PER_INCH) * dpi;
}

/** Pixels (or PDF points, at 72 DPI) to millimetres at a given resolution. */
export function pxToMm(px: number, dpi: number): number {
	return (px / dpi) * MM_PER_INCH;
}
