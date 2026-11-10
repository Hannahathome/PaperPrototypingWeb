// FrustumSupport web app: edits a FrameInput, previews the frame and downloads the .scad.
// Geometry and file text come from ../core; this file only displays and wires the form.
import { singleFileName } from '../../../lib/export';
import { downloadBlob } from '../../../lib/files';
import { frameGeometry } from '../core/frame';
import { DEFAULT_FRAME, RIG_TEMPLATES, templateFor, type FrameInput, type Rig } from '../core/params';
import { frameScad } from '../core/scad';
import { FrameView3D } from './view3d';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => $<HTMLInputElement>(id);

const RIG_FIELDS: [keyof Rig, string][] = [
	['width', 'rigWidth'],
	['depth', 'rigDepth'],
	['height', 'rigHeight'],
	['offsetX', 'rigOffsetX'],
	['offsetY', 'rigOffsetY'],
	['offsetZ', 'rigOffsetZ'],
	['rotation', 'rigRotation'],
];

export function startApp(): void {
	const state: FrameInput = structuredClone(DEFAULT_FRAME);
	let selected = 0;
	const view = new FrameView3D($('view3d'));

	const templateSelect = $<HTMLSelectElement>('rigTemplate');
	for (const name of ['Custom', ...Object.keys(RIG_TEMPLATES)]) templateSelect.add(new Option(name, name));

	/** Show the selected rig's values in the rig fields. */
	const showRig = () => {
		const rig = state.rigs[selected];
		for (const [key, id] of RIG_FIELDS) input(id).value = String(rig[key]);
		templateSelect.value = rig.template in RIG_TEMPLATES ? rig.template : 'Custom';
		const list = $<HTMLSelectElement>('rigList');
		list.replaceChildren(...state.rigs.map((_, i) => new Option(`Rig ${i + 1}`, String(i))));
		list.value = String(selected);
		$<HTMLButtonElement>('removeRig').disabled = state.rigs.length <= 1;
	};

	const update = () => {
		const rigs = state.rigsEnabled;
		$('rigFields').hidden = !rigs;
		$('strutFields').hidden = !rigs;
		input('strutSpacing').disabled = !state.dualStruts;
		view.update(frameGeometry(state), selected);
	};

	const readFrame = () => {
		state.sides = Number(input('sides').value);
		state.bottomRadius = Number(input('bottomRadius').value);
		state.topRadius = Number(input('topRadius').value);
		state.height = Number(input('height').value);
		state.edgeRadius = Number(input('edgeRadius').value);
		state.rigsEnabled = input('rigsEnabled').checked;
		state.dualStruts = input('dualStruts').checked;
		state.strutSpacing = Number(input('strutSpacing').value);
		update();
	};
	$('frameFields').addEventListener('input', readFrame);
	$('frameFields').addEventListener('change', readFrame);
	$('strutFields').addEventListener('input', readFrame);
	$('strutFields').addEventListener('change', readFrame);

	// Editing a size by hand makes the rig Custom unless it still matches a template exactly.
	$('rigValues').addEventListener('input', () => {
		const rig = state.rigs[selected];
		for (const [key, id] of RIG_FIELDS) (rig[key] as number) = Number(input(id).value);
		rig.template = templateFor(rig);
		templateSelect.value = rig.template;
		update();
	});
	templateSelect.addEventListener('change', () => {
		const rig = state.rigs[selected];
		const size = RIG_TEMPLATES[templateSelect.value];
		rig.template = templateSelect.value;
		if (size) [rig.width, rig.depth, rig.height] = size;
		showRig();
		update();
	});
	$('rigList').addEventListener('change', () => {
		selected = Number($<HTMLSelectElement>('rigList').value);
		showRig();
		update();
	});
	$('addRig').addEventListener('click', () => {
		// Like Processing: the new rig is a copy of the selected one.
		state.rigs.push({ ...state.rigs[selected] });
		selected = state.rigs.length - 1;
		showRig();
		update();
	});
	$('removeRig').addEventListener('click', () => {
		if (state.rigs.length <= 1) return;
		state.rigs.splice(selected, 1);
		selected = Math.min(selected, state.rigs.length - 1);
		showRig();
		update();
	});
	$('resetView').addEventListener('click', () => {
		view.reset();
		update();
	});

	$('export').addEventListener('click', () => {
		const name = singleFileName(input('name').value, 'scad', new Date());
		downloadBlob(new Blob([frameScad(state)], { type: 'text/plain' }), name);
		$('status').textContent = `Downloaded ${name}.`;
	});

	showRig();
	readFrame();
}
