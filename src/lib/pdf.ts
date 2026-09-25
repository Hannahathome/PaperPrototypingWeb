// Print PDF on A4 landscape, laid out in millimetres by jsPDF.
import { jsPDF } from 'jspdf';
import { printCrosses } from './calibration';
import { toCutterPaths, type Path, type Sheet } from './drawing';
import { mmToPx } from './units';

/** Processing draws outlines at 0.5 pt and the calibration crosses at 1 pt. */
export const OUTLINE_WIDTH_MM = 0.5 * (25.4 / 72);
export const CROSS_WIDTH_MM = 1 * (25.4 / 72);

export interface PdfOptions {
	/** Compress content streams. Tests turn this off to read the drawing operators. */
	compress?: boolean;
}

function tracePath(doc: jsPDF, path: Path): void {
	const [first, ...rest] = path.points;
	if (!first) return;
	doc.moveTo(first[0], first[1]);
	for (const [x, y] of rest) doc.lineTo(x, y);
	if (path.closed) doc.close();
}

function drawPaths(doc: jsPDF, paths: Path[], lineWidth: number): void {
	doc.setLineWidth(lineWidth);
	for (const path of paths) {
		if (path.points.length < 2) continue;
		doc.setDrawColor(path.colour ?? '#000000');
		if (path.fill) doc.setFillColor(path.fill);
		tracePath(doc, path);
		if (path.fill) doc.fill();
		else doc.stroke();
	}
}

/**
 * The print file for a sheet: images underneath, then print paths, then cut and fold lines
 * (folds as the same dashes the cutter scores), labels, and the registration crosses.
 */
export function buildPdf(sheet: Sheet, { compress = true }: PdfOptions = {}): jsPDF {
	const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape', compress });
	doc.setDrawColor('#000000');

	for (const image of sheet.images ?? []) {
		doc.addImage(image.dataUrl, image.at[0], image.at[1], image.width, image.height);
	}

	const printPaths = sheet.paths.filter((path) => path.kind === 'print');
	drawPaths(doc, printPaths, OUTLINE_WIDTH_MM);
	drawPaths(doc, toCutterPaths(sheet.paths), OUTLINE_WIDTH_MM);

	doc.setTextColor('#000000');
	for (const label of sheet.labels ?? []) {
		doc.setFontSize(mmToPx(label.size, 72));
		doc.text(label.text, label.at[0], label.at[1], { baseline: label.baseline ?? 'alphabetic', align: label.align ?? 'left' });
	}

	drawPaths(doc, printCrosses(), CROSS_WIDTH_MM);
	return doc;
}
