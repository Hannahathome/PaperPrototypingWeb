// On-screen preview of a sheet as an SVG string: the A4 page, the cutting area, printed
// artwork, and cut and fold lines in distinct colours. Display only; exports use svg.ts/pdf.ts.
import { cutCrosses, printCrosses } from './calibration';
import type { Path, Sheet } from './drawing';
import { fmt, pathData } from './svg';
import { A4_LANDSCAPE, CUT_AREA } from './units';

export const PREVIEW_COLOURS = {
	cut: '#d1242f',
	fold: '#1f6feb',
	print: '#444444',
	cutArea: '#9aa0a6',
} as const;

export function escapeXml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pathElement(path: Path, style: string): string {
	return `<path d="${pathData(path)}" ${style}/>`;
}

const stroke = (colour: string, widthPx: number, extra = '') =>
	`fill="none" stroke="${colour}" stroke-width="${widthPx}" vector-effect="non-scaling-stroke" ${extra}`.trim();

/** The drawing of a sheet's content (images, artwork, folds, cuts, labels) as SVG elements. */
export function previewContent(sheet: Sheet): string {
	const parts: string[] = [];
	for (const image of sheet.images ?? []) {
		parts.push(
			`<image href="${image.dataUrl}" x="${fmt(image.at[0])}" y="${fmt(image.at[1])}" width="${fmt(image.width)}" height="${fmt(image.height)}" preserveAspectRatio="none"/>`,
		);
	}
	for (const path of sheet.paths.filter((p) => p.kind === 'print')) {
		parts.push(pathElement(path, path.fill ? `fill="${path.fill}" stroke="none"` : stroke(PREVIEW_COLOURS.print, 1)));
	}
	for (const path of sheet.paths.filter((p) => p.kind === 'fold')) {
		parts.push(pathElement(path, stroke(PREVIEW_COLOURS.fold, 1.5, 'stroke-dasharray="3 3"')));
	}
	for (const path of sheet.paths.filter((p) => p.kind === 'cut')) {
		parts.push(pathElement(path, stroke(PREVIEW_COLOURS.cut, 1.5)));
	}
	for (const label of sheet.labels ?? []) {
		parts.push(
			`<text x="${fmt(label.at[0])}" y="${fmt(label.at[1])}" font-size="${fmt(label.size)}" font-family="Helvetica, Arial, sans-serif" fill="#000"${label.align === 'center' ? ' text-anchor="middle"' : ''}${label.baseline === 'middle' ? ' dominant-baseline="middle"' : ''}>${escapeXml(label.text)}</text>`,
		);
	}
	return parts.join('\n');
}

/** An A4 page around `content` (SVG elements in page mm), with the cutting area and crosses on top. */
export function previewFrame(content: string, { title = 'Sheet preview', overlay = '' }: { title?: string; overlay?: string } = {}): string {
	const { width, height } = A4_LANDSCAPE;
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">`,
		`<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>`,
		content,
		`<rect x="0" y="0" width="${CUT_AREA.width}" height="${CUT_AREA.height}" ${stroke(PREVIEW_COLOURS.cutArea, 1, 'stroke-dasharray="4 3"')}/>`,
		...printCrosses().map((p) => pathElement(p, stroke(PREVIEW_COLOURS.print, 1))),
		...cutCrosses().map((p) => pathElement(p, stroke(PREVIEW_COLOURS.cut, 1, 'stroke-opacity="0.35"'))),
		overlay,
		'</svg>',
	].join('\n');
}

export function previewSvg(sheet: Sheet, options: { title?: string } = {}): string {
	return previewFrame(previewContent(sheet), options);
}
