// ScaffoldShell = the PaperPolyhedra app + a Scaffold panel per shape. This extension keeps each
// shape's scaffold settings, adds rig windows to the net, notes, the frame in the 3D view, and a
// .scad per framed shape to the download. Geometry and files come from ../core.
import { exportStamp, sanitiseName } from '../../../lib/export';
import { escapeXml } from '../../../lib/preview';
import type { Net } from '../../paperpolyhedra/core/net';
import { shapeDims, type ShapeInput } from '../../paperpolyhedra/core/params';
import type { AppExtension } from '../../paperpolyhedra/ui/app';
import { DEFAULT_FRAME_SETTINGS, frameDims, frameGeometry, frameScadParams, NEW_RIG, presetFor, RIG_CUT, RIG_PRESETS, type FrameSettings, type Rig } from '../core/frame';
import { frameShapeSlug, scaffoldScad } from '../core/scad';
import { planWindows, windowPaths } from '../core/windows';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const num = (id: string) => Number($<HTMLInputElement>(id).value);

const RIG_FIELDS: [keyof Rig, string][] = [
	['width', 'rigWidth'],
	['depth', 'rigDepth'],
	['height', 'rigHeight'],
	['offsetX', 'rigOffsetX'],
	['offsetY', 'rigOffsetY'],
	['offsetZ', 'rigOffsetZ'],
	['rotation', 'rigRotation'],
];

/** Per-shape scaffold data: settings plus which rig is selected in the panel. */
export interface ScaffoldData {
	settings: FrameSettings;
	selectedRig: number;
}

export function scaffoldExtension(): AppExtension<ScaffoldData> {
	let changed = () => {};
	let current: () => { data: ScaffoldData; shape: ShapeInput } = () => {
		throw new Error('not mounted');
	};

	const showRigs = (data: ScaffoldData, shape: ShapeInput) => {
		const s = data.settings;
		const hasRigs = s.rigs.length > 0;
		$('rigFields').hidden = !hasRigs;
		const list = $<HTMLSelectElement>('rigList');
		list.replaceChildren(...s.rigs.map((_, i) => new Option(`Rig ${i + 1}`, String(i))));
		$<HTMLButtonElement>('removeRig').disabled = !hasRigs;
		if (!hasRigs) return;
		data.selectedRig = Math.min(Math.max(0, data.selectedRig), s.rigs.length - 1);
		list.value = String(data.selectedRig);
		const rig = s.rigs[data.selectedRig];
		for (const [key, id] of RIG_FIELDS) $<HTMLInputElement>(id).value = String(rig[key]);
		$<HTMLSelectElement>('rigPreset').value = rig.preset in RIG_PRESETS ? rig.preset : 'Custom';
		$<HTMLSelectElement>('rigWindow').value = String(rig.cutoutFace);
		$<HTMLSelectElement>('rigWindowSize').value = String(rig.cutoutSize);
		$<HTMLSelectElement>('rigWindowSize').disabled = rig.cutoutFace === RIG_CUT.none;
		const plan = planWindows(shape, s).find((p) => p.rigIndex === data.selectedRig);
		$('rigStatus').textContent = rig.cutoutFace === RIG_CUT.none ? '' : (plan?.status ?? '');
	};

	const write = (data: ScaffoldData, shape: ShapeInput) => {
		const s = data.settings;
		$<HTMLInputElement>('sfEnabled').checked = s.enabled;
		$('sfFields').hidden = !s.enabled;
		$<HTMLInputElement>('sfStrut').value = String(s.strutRadius);
		$<HTMLInputElement>('sfClearance').value = String(s.clearance);
		$<HTMLInputElement>('sfFlap').value = String(s.flapLength);
		$<HTMLInputElement>('sfDual').checked = s.dualStruts;
		$<HTMLInputElement>('sfSpacing').value = String(s.strutSpacing);
		$<HTMLInputElement>('sfSpacing').disabled = !s.dualStruts;
		const d = frameDims(shape);
		$('sfDerived').textContent = `${d.n} sides · R bottom ${d.botR.toFixed(1)} · R top ${d.topR.toFixed(1)} · H ${d.height.toFixed(1)} mm`;
		showRigs(data, shape);
	};

	return {
		create: () => ({ settings: structuredClone(DEFAULT_FRAME_SETTINGS), selectedRig: 0 }),
		copy: (data) => structuredClone(data),

		mount(context) {
			changed = context.changed;
			current = context.current;
			const preset = $<HTMLSelectElement>('rigPreset');
			for (const name of ['Custom', ...Object.keys(RIG_PRESETS)]) preset.add(new Option(name, name));
			const rigAction = (fn: (data: ScaffoldData) => void) => () => {
				const { data, shape } = current();
				fn(data);
				write(data, shape);
				changed();
			};
			$('addRig').addEventListener(
				'click',
				rigAction((data) => {
					// Like ScaffoldShell: the new rig copies the selected one (or the default).
					const base = data.settings.rigs[data.selectedRig];
					data.settings.rigs.push(base ? { ...base } : { ...NEW_RIG });
					data.selectedRig = data.settings.rigs.length - 1;
				}),
			);
			$('removeRig').addEventListener(
				'click',
				rigAction((data) => {
					data.settings.rigs.splice(data.selectedRig, 1);
					data.selectedRig = Math.max(0, data.selectedRig - 1);
				}),
			);
			$('rigList').addEventListener(
				'change',
				rigAction((data) => (data.selectedRig = Number($<HTMLSelectElement>('rigList').value))),
			);
			preset.addEventListener(
				'change',
				rigAction((data) => {
					const rig = data.settings.rigs[data.selectedRig];
					const size = RIG_PRESETS[preset.value];
					rig.preset = preset.value;
					if (size) [rig.width, rig.depth, rig.height] = size;
				}),
			);
		},

		write,

		read(data) {
			const s = data.settings;
			s.enabled = $<HTMLInputElement>('sfEnabled').checked;
			s.strutRadius = Math.max(0.1, num('sfStrut'));
			s.clearance = Math.max(0, num('sfClearance'));
			s.flapLength = Math.max(0, num('sfFlap'));
			s.dualStruts = $<HTMLInputElement>('sfDual').checked;
			s.strutSpacing = Math.max(0, num('sfSpacing'));
			const rig = s.rigs[data.selectedRig];
			if (rig && !$('rigFields').hidden) {
				for (const [key, id] of RIG_FIELDS) (rig[key] as number) = num(id);
				// Editing the size by hand makes the rig Custom unless it still matches a preset.
				rig.preset = presetFor(rig);
				rig.cutoutFace = Number($<HTMLSelectElement>('rigWindow').value) as Rig['cutoutFace'];
				rig.cutoutSize = Number($<HTMLSelectElement>('rigWindowSize').value) as Rig['cutoutSize'];
			}
			// Keep the panel's derived read-outs and statuses current.
			queueMicrotask(() => write(data, current().shape));
		},

		paths(data, shape, net: Net) {
			return data.settings.enabled ? windowPaths(net, planWindows(shape, data.settings)) : [];
		},

		notes(data, shape) {
			const s = data.settings;
			if (!s.enabled) return [];
			const notes: string[] = [];
			const p = frameScadParams(shape, s);
			if (!p.valid) return [`<strong>No scaffold:</strong> ${p.problem}. Make the shape bigger, or the struts thinner.`];
			const g = frameGeometry(shape, s);
			if (g.highestRigTop > g.zTop + 1e-9) notes.push('A rig sticks out above the top of the scaffold. Lower its Offset Z or Height.');
			const dims = shapeDims(shape);
			if (Math.abs(dims.foldedHeight - dims.height) > 0.05) {
				notes.push(
					`The scaffold is built to the entered height (${dims.height.toFixed(1)} mm), as ScaffoldShell does, but this frustum folds to ${dims.foldedHeight.toFixed(1)} mm. Check the fit before printing (listed for review).`,
				);
			}
			for (const w of planWindows(shape, s)) {
				if (w.reaches && !w.fits) notes.push(`Rig ${w.rigIndex + 1}: its window ${w.onLid ? "runs over the lid's edge" : 'crosses a fold line'}. It is still cut; move the rig or pick a smaller window.`);
			}
			return notes.map((n) => (n.startsWith('<') ? n : escapeXml(n)));
		},

		view3d(data, shape) {
			return data.settings.enabled ? frameGeometry(shape, data.settings) : null;
		},

		files(items, name, date) {
			const stamp = exportStamp(date);
			return items.flatMap(({ data, shape, label, index }) => {
				if (!data.settings.enabled) return [];
				const text = scaffoldScad(shape, data.settings);
				if (!text) return [];
				return [{ name: `${sanitiseName(name)}_${stamp}_frame_${frameShapeSlug(label, index)}.scad`, blob: new Blob([text], { type: 'text/plain' }) }];
			});
		},
	};
}
