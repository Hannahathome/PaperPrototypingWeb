// DataPhysicalisation web app: load a CSV, map columns, preview in 3D or as a 2D chart,
// export JSON for PaperPolyhedra. All calculations come from ../core.
import { downloadBlob, readAsText } from '../../../lib/files';
import { sendHandoff } from '../../../lib/handoff';
import { withBase } from '../../../lib/paths';
import { parseCsv, type Table } from '../core/csv';
import {
	bandColour,
	buildShapes,
	DEFAULT_SETTINGS,
	defaultMapping,
	exportEntries,
	MIN_SIDES,
	nonSquareBars,
	parseThresholds,
	type Mapping,
	type Settings,
} from '../core/mapping';
import { toHex } from '../core/colour';
import exampleCsv from '../examples/animals.csv?raw';
import { chartSvg } from './chart2d';
import { ShapesView3D } from './view3d';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const num = (id: string) => Number($<HTMLInputElement>(id).value);

const MAPPED: { key: keyof Mapping; id: string; allowNone: boolean }[] = [
	{ key: 'label', id: 'mapLabel', allowNone: true },
	{ key: 'height', id: 'mapHeight', allowNone: false },
	{ key: 'diameter', id: 'mapDiameter', allowNone: true },
	{ key: 'width', id: 'mapWidth', allowNone: true },
	{ key: 'depth', id: 'mapDepth', allowNone: true },
	{ key: 'sides', id: 'mapSides', allowNone: true },
	{ key: 'colour', id: 'mapColour', allowNone: true },
];

const escape = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function startApp(): void {
	let table: Table | null = null;
	let fileName = '';
	let view3d: ShapesView3D | null = null;
	let mapping: Mapping | null = null;

	const settings = (): Settings => ({
		mode: $<HTMLSelectElement>('mode').value as Settings['mode'],
		barSize: $<HTMLSelectElement>('barSize').value as Settings['barSize'],
		trueSize: $<HTMLSelectElement>('scaling').value === 'true',
		scaleH: num('scaleH'),
		minHeightPct: num('minHeightPct'),
		scaleDiam: num('scaleDiam'),
		minDiamPct: num('minDiamPct'),
		scaleSides: Math.max(MIN_SIDES, Math.trunc(num('scaleSides'))),
		thresholds: parseThresholds($<HTMLInputElement>('thresholds').value),
		visible: Math.trunc(num('visible')),
	});

	const fillColumns = () => {
		if (!table) return;
		for (const { key, id, allowNone } of MAPPED) {
			const select = $<HTMLSelectElement>(id);
			select.replaceChildren(
				...(allowNone ? [new Option('(none)', '-1')] : []),
				...table.columns.map((name, i) => new Option(name, String(i))),
			);
			select.value = String(mapping![key]);
		}
		const visible = $<HTMLInputElement>('visible');
		visible.max = String(table.rows.length);
		visible.value = String(table.rows.length);
	};

	const load = (text: string, name: string) => {
		const parsed = parseCsv(text);
		if (parsed.columns.length === 0 || parsed.rows.length === 0) {
			$('status').textContent = `${name} has no rows.`;
			return;
		}
		table = parsed;
		fileName = name;
		mapping = defaultMapping(parsed);
		fillColumns();
		$('source').textContent = `${name}: ${parsed.rows.length} rows, ${parsed.columns.length} columns`;
		$('workspace').hidden = false;
		$('empty').hidden = true;
		view3d ??= new ShapesView3D($('view3d'));
		update();
	};

	const update = () => {
		if (!table || !mapping) return;
		for (const { key, id } of MAPPED) mapping[key] = Number($<HTMLSelectElement>(id).value);
		const s = settings();
		const polyhedra = s.mode === 'polyhedra';
		const separate = !polyhedra && s.barSize === 'separate';
		$('barSizeField').hidden = polyhedra;
		$('diameterField').hidden = separate;
		$('widthField').hidden = !separate;
		$('depthField').hidden = !separate;
		$('sidesFields').hidden = !polyhedra;
		$('sidesMax').hidden = !polyhedra;
		$('minFields').hidden = s.trueSize;
		$('viewTabs').hidden = polyhedra;
		const use2d = !polyhedra && $<HTMLInputElement>('view2d').checked;
		$('view3dBox').hidden = use2d;
		$('chart').hidden = !use2d;

		const shapes = buildShapes(table, mapping, s);
		view3d?.update(shapes, s.mode);
		if (use2d) $('chart').innerHTML = chartSvg(shapes, table.columns[mapping.height] ?? '');

		// Table of shapes.
		$('shapes').innerHTML = shapes
			.map(
				(sh) =>
					`<tr><td><span class="swatch" style="background:${sh.colour}"></span>${escape(sh.label)}</td><td>${sh.height.toFixed(1)}</td><td>${
						polyhedra ? `${sh.diameter.toFixed(1)} Ø` : `${sh.width.toFixed(1)} × ${sh.depth.toFixed(1)}`
					}</td><td>${polyhedra ? sh.sides : 4}</td></tr>`,
			)
			.join('');

		// Legend for colour thresholds.
		const bands = s.thresholds.length + 1;
		$('legend').innerHTML =
			s.thresholds.length > 0 && mapping.colour >= 0
				? Array.from({ length: bands }, (_, b) => {
						const label = b === 0 ? `< ${s.thresholds[0]}` : b === bands - 1 ? `≥ ${s.thresholds[b - 1]}` : `${s.thresholds[b - 1]}–${s.thresholds[b]}`;
						return `<span><span class="swatch" style="background:${toHex(bandColour(b, bands))}"></span>${label}</span>`;
					}).join('')
				: '';

		// Notes.
		const notes: string[] = [];
		const missing = shapes.filter((sh) => !Number.isFinite(sh.height)).length;
		if (missing) notes.push(`${missing} row(s) have no number in the height column; they cannot be exported.`);
		const uneven = nonSquareBars(shapes, s.mode).length;
		if (uneven) {
			notes.push(`${uneven} bar(s) have different width and depth. PaperPolyhedra makes square prisms, so it will use the width for both.`);
		}
		$('notes').innerHTML = notes.map((n) => `<p>${n}</p>`).join('');
		$('notes').hidden = notes.length === 0;
		$<HTMLButtonElement>('export').disabled = missing > 0;
		$<HTMLButtonElement>('send').disabled = missing > 0;
	};

	const exportJson = () => {
		if (!table || !mapping) return '';
		const s = settings();
		return `${JSON.stringify(exportEntries(buildShapes(table, mapping, s), s.mode), null, 2)}\n`;
	};

	$<HTMLInputElement>('csvFile').addEventListener('change', async (event) => {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file) load(await readAsText(file), file.name);
	});
	$('useExample').addEventListener('click', () => load(exampleCsv, 'animals.csv (example)'));
	$('controls').addEventListener('input', update);
	$('controls').addEventListener('change', update);
	$('viewTabs').addEventListener('change', update);
	for (const which of ['front', 'top', 'side', 'iso'] as const) {
		$(`view-${which}`).addEventListener('click', () => view3d?.view(which));
	}
	$('export').addEventListener('click', () => {
		const name = `${($<HTMLInputElement>('name').value.trim() || 'export').replace(/\.json$/i, '')}.json`;
		downloadBlob(new Blob([exportJson()], { type: 'application/json' }), name);
		$('status').textContent = `Downloaded ${name}.`;
	});
	$('send').addEventListener('click', () => {
		if (sendHandoff(`DataPhysicalisation (${fileName})`, exportJson())) {
			window.location.href = withBase('apps/paperpolyhedra/?import=handoff');
		} else {
			$('status').textContent = 'Your browser blocked passing the shapes on. Download the JSON and load it in PaperPolyhedra instead.';
		}
	});

	// Processing's defaults in the form.
	const d = DEFAULT_SETTINGS;
	$<HTMLSelectElement>('mode').value = d.mode;
	$<HTMLSelectElement>('barSize').value = d.barSize;
}
