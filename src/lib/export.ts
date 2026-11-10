// The three-file export every print-and-cut tool produces (docs/shared-concepts.md in the
// PaperPrototyping repo):
//   <name>_<stamp>.pdf        printer: artwork, fills, labels
//   <name>_fold_<stamp>.svg   cutter:  cut and fold lines
//   <name>_calib_<stamp>.svg  cutter:  registration marks only
import { cutCrosses } from './calibration';
import { boundsOf, toCutterPaths, type Sheet } from './drawing';
import { buildPdf } from './pdf';
import { toSvg } from './svg';
import { CUT_AREA } from './units';

/**
 * Timestamp `M_D_H_MM_SS`, e.g. 25 September 14:05:09 → "9_25_14_05_09". Minutes and
 * seconds are zero-padded as the convention's `MM_SS` says; Processing does not pad them.
 */
export function exportStamp(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return [date.getMonth() + 1, date.getDate(), date.getHours(), pad(date.getMinutes()), pad(date.getSeconds())].join('_');
}

/** A safe base name: characters that are invalid in file names become "-". Empty → "result", as in Processing. */
export function sanitiseName(name: string): string {
	const cleaned = name
		.trim()
		.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
		.replace(/\s+/g, ' ');
	return cleaned === '' ? 'result' : cleaned;
}

export function exportFileNames(name: string, date: Date): { pdf: string; fold: string; calib: string } {
	const base = sanitiseName(name);
	const stamp = exportStamp(date);
	return {
		pdf: `${base}_${stamp}.pdf`,
		fold: `${base}_fold_${stamp}.svg`,
		calib: `${base}_calib_${stamp}.svg`,
	};
}

/** Name for a single exported file that is not part of the print-and-cut set, e.g. an OpenSCAD model. */
export function singleFileName(name: string, extension: string, date: Date): string {
	return `${sanitiseName(name)}_${exportStamp(date)}.${extension}`;
}

/** True when every cut and fold line lies inside the 280 × 200 mm cutting area. */
export function fitsCutArea(sheet: Sheet): boolean {
	const bounds = boundsOf(sheet.paths.filter((path) => path.kind !== 'print'));
	if (!bounds) return true;
	return bounds.minX >= 0 && bounds.minY >= 0 && bounds.maxX <= CUT_AREA.width && bounds.maxY <= CUT_AREA.height;
}

export function foldSvg(sheet: Sheet): string {
	return toSvg(toCutterPaths(sheet.paths), CUT_AREA);
}

export function calibSvg(): string {
	// Processing draws the cut crosses at 1 px (96 DPI); the PDF crosses at 1 pt.
	return toSvg(cutCrosses(), { ...CUT_AREA, strokeWidth: (1 * 25.4) / 96 });
}

export interface ExportFile {
	name: string;
	blob: Blob;
}

/** The three files for a sheet, named for `name` at `date`. */
export function buildExportFiles(sheet: Sheet, name: string, date: Date = new Date()): ExportFile[] {
	const names = exportFileNames(name, date);
	const svgBlob = (text: string) => new Blob([text], { type: 'image/svg+xml' });
	return [
		{ name: names.pdf, blob: buildPdf(sheet).output('blob') },
		{ name: names.fold, blob: svgBlob(foldSvg(sheet)) },
		{ name: names.calib, blob: svgBlob(calibSvg()) },
	];
}
