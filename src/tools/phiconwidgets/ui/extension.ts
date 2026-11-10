// Phicon Widgets: the PaperPhicons app plus a list of cut-outs in the base face. Display only;
// the sheet and checks come from the core.
import type { PhiconsExtension } from '../../paperphicons/ui/app';
import { buildWidgetSheet, cutoutOutline, NEW_CUTOUT, type Cutout, type CutoutShape } from '../core/cutouts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const SHAPE_NAMES: Record<CutoutShape, string> = { square: 'Square', pill: 'Pill', circle: 'Circle' };

/** Short description for the list, e.g. "Pill 40 × 10, vertical, at (0, 10)". */
function describe(c: Cutout): string {
	const size = c.shape === 'circle' ? `Ø${c.width}` : `${c.width} × ${c.height}`;
	return `${SHAPE_NAMES[c.shape]} ${size}${c.shape === 'pill' && c.vertical ? ', vertical' : ''} at (${c.x}, ${c.y})`;
}

export function widgetExtension(initial: Cutout[]): PhiconsExtension {
	const cutouts: Cutout[] = initial.map((c) => ({ ...c }));
	let selected = cutouts.length ? 0 : -1;

	const list = () => $<HTMLSelectElement>('cutList');
	const field = (id: string) => $<HTMLInputElement>(id);

	const renderList = () => {
		list().innerHTML = cutouts.map((c, i) => `<option value="${i}"${i === selected ? ' selected' : ''}>${i + 1}. ${describe(c)}</option>`).join('');
		list().disabled = cutouts.length === 0;
		$<HTMLButtonElement>('removeCut').disabled = selected < 0;
		$('cutCount').textContent = cutouts.length ? `${cutouts.length} cut-out${cutouts.length > 1 ? 's' : ''} in each block.` : 'No cut-outs yet.';
	};

	const writeFields = () => {
		$('cutFields').hidden = selected < 0;
		if (selected < 0) return;
		const c = cutouts[selected];
		$<HTMLSelectElement>('cutShape').value = c.shape;
		field('cutWidth').value = String(c.width);
		field('cutHeight').value = String(c.height);
		field('cutX').value = String(c.x);
		field('cutY').value = String(c.y);
		field('cutVertical').checked = c.vertical;
		showShapeFields(c.shape);
	};

	const showShapeFields = (shape: CutoutShape) => {
		$('cutWidthLabel').textContent = shape === 'circle' ? 'Diameter (mm)' : shape === 'pill' ? 'Length (mm)' : 'Width (mm)';
		$('cutHeightLabel').textContent = shape === 'pill' ? 'Width (mm)' : 'Height (mm)';
		$('cutHeightField').hidden = shape === 'circle';
		$('cutVerticalField').hidden = shape !== 'pill';
	};

	const readFields = () => {
		if (selected < 0) return;
		const num = (id: string, fallback: number) => {
			const v = Number(field(id).value);
			return Number.isFinite(v) ? v : fallback;
		};
		const c = cutouts[selected];
		c.shape = $<HTMLSelectElement>('cutShape').value as CutoutShape;
		c.width = num('cutWidth', c.width);
		c.height = num('cutHeight', c.height);
		c.x = num('cutX', c.x);
		c.y = num('cutY', c.y);
		c.vertical = field('cutVertical').checked;
		showShapeFields(c.shape);
	};

	return {
		mount(changed) {
			renderList();
			writeFields();
			$('cutoutFields').addEventListener('input', (e) => {
				if (e.target === list()) return;
				readFields();
				renderList();
				changed();
			});
			list().addEventListener('change', () => {
				selected = Number(list().value);
				renderList();
				writeFields();
			});
			$('addCut').addEventListener('click', () => {
				// A new cut-out starts as a copy of the selected one, moved aside so both show.
				const base = selected >= 0 ? { ...cutouts[selected], x: cutouts[selected].x + 5, y: cutouts[selected].y + 5 } : { ...NEW_CUTOUT };
				cutouts.push(base);
				selected = cutouts.length - 1;
				renderList();
				writeFields();
				changed();
			});
			$('removeCut').addEventListener('click', () => {
				if (selected < 0) return;
				cutouts.splice(selected, 1);
				selected = Math.min(selected, cutouts.length - 1);
				renderList();
				writeFields();
				changed();
			});
		},
		build: (input) => buildWidgetSheet({ ...input, cutouts }),
		holes: () => cutouts.map((c) => cutoutOutline(c, [0, 0])),
	};
}
