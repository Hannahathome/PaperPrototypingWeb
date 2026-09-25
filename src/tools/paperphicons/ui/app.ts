// PaperPhicons web app: reads the form, asks the core for the sheet, previews and exports it.
import { buildExportFiles } from '../../../lib/export';
import { downloadAll } from '../../../lib/files';
import { previewSvg } from '../../../lib/preview';
import { buildBlockSheet, type BlockInput } from '../core/block';
import { BlockView3D } from './view3d';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const num = (id: string) => Number($<HTMLInputElement>(id).value);

export function startApp(): void {
	const view = new BlockView3D($('view3d'));

	const readInput = (): BlockInput => ({
		width: num('width'),
		length: num('length'),
		height: num('height'),
		firstMarkerId: Math.trunc(num('firstMarkerId')),
		markerSize: num('markerSize'),
		copies: Math.max(1, Math.min(16, Math.trunc(num('copies')))),
		markerOnSide: $<HTMLSelectElement>('markerFace').value === 'side',
	});

	const update = () => {
		const input = readInput();
		const result = buildBlockSheet(input);
		const ids = result.markerIds;
		$('facts').innerHTML = [
			['Marker ids', ids.length > 1 ? `${ids[0]}–${ids[ids.length - 1]}` : String(ids[0])],
			['Marker with white margin', `${((input.markerSize * 9) / 7).toFixed(1)} mm`],
			['Dictionary', 'ArUco original (5 × 5)'],
		]
			.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
			.join('');
		const notes = [
			...result.errors.map((e) => `<strong>${e}</strong>`),
			...result.warnings,
			...(result.fitsCutArea ? [] : ['<strong>Part of the sheet lies outside the 280 × 200 mm cutting area</strong>; use fewer copies or smaller blocks.']),
		];
		$('notes').innerHTML = notes.map((n) => `<p>${n}</p>`).join('');
		$('notes').hidden = notes.length === 0;
		$<HTMLButtonElement>('export').disabled = result.errors.length > 0;
		$('sheet').innerHTML = previewSvg(result.sheet, { title: 'PaperPhicons sheet preview' });
		view.update(input, result.errors.length ? null : ids[0]);
	};

	let timer: number | undefined;
	const schedule = () => {
		window.clearTimeout(timer);
		timer = window.setTimeout(update, 100);
	};
	$('controls').addEventListener('input', schedule);
	$('controls').addEventListener('change', schedule);
	$('resetView').addEventListener('click', () => {
		view.reset();
		update();
	});

	const button = $<HTMLButtonElement>('export');
	button.addEventListener('click', async () => {
		const result = buildBlockSheet(readInput());
		if (result.errors.length) return;
		button.disabled = true;
		try {
			const files = buildExportFiles(result.sheet, $<HTMLInputElement>('name').value);
			await downloadAll(files);
			$('status').textContent = `Downloaded ${files.map((f) => f.name).join(', ')}.`;
		} catch (error) {
			$('status').textContent = `Something went wrong: ${error instanceof Error ? error.message : String(error)}`;
		} finally {
			button.disabled = false;
		}
	});

	update();
}
