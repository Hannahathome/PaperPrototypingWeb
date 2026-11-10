// PaperPolyhedra web app: one or more shapes on a sheet. The form edits the selected shape;
// shapes are placed by dragging them on the sheet preview (or arranged automatically), and
// can be imported from a JSON file (e.g. from DataPhysicalisation). Everything geometric comes
// from ../core; this file only displays, places and exports what the core returns.
import type { Path, Point, Sheet } from '../../../lib/drawing';
import { buildExportFiles, type ExportFile } from '../../../lib/export';
import { downloadAll, readAsDataUrl, readAsText } from '../../../lib/files';
import { takeHandoff } from '../../../lib/handoff';
import { escapeXml, previewContent, previewFrame } from '../../../lib/preview';
import { PRINT_DPI, rasteriseTriangles, toRasterImage, trianglesBounds, type RasterTriangle, type TextureSource } from '../../../lib/raster';
import { A4_LANDSCAPE } from '../../../lib/units';
import { buildArtwork, type Artwork, type ImageSlot, type SideMode } from '../core/artwork';
import { importShapes } from '../core/import';
import { arrangeOffsets, insideCutArea, netBounds, offsetIntoFreeSpot, overlappingPairs, touchesCrossZone, translateNet, type Bounds } from '../core/layout';
import { buildNet, type Net } from '../core/net';
import { DEFAULT_INPUT, type ShapeInput } from '../core/params';
import type { FrameGeometry } from '../../scaffoldshell/core/frame';
import { ShapeView3D } from './view3d';

const PREVIEW_DPI = 60;
const SELECTED = '#ffa000'; // Processing's SELECTION_ORANGE

interface Images {
	strip: TextureSource | null;
	panels: (TextureSource | null)[];
	topLid: TextureSource | null;
	bottomLid: TextureSource | null;
}

interface Look {
	fillOn: boolean;
	fill: string;
	sideMode: SideMode;
	rotate: boolean;
	images: Images;
}

interface SheetShape {
	label: string;
	input: ShapeInput;
	lock: boolean;
	look: Look;
	/** Position relative to where buildNet puts the net (mm). */
	offset: Point;
	/** On this sheet (exported) or set aside. */
	include: boolean;
	/** Bumped when the shape's images change, so its cached preview is rebuilt. */
	version: number;
	/** Per-shape data of an extension (e.g. ScaffoldShell's scaffold settings); plain JSON. */
	ext: unknown;
}

/** What an extension of the app (ScaffoldShell) can add, per shape. */
export interface AppExtension<T> {
	/** Data for a new shape, and a deep copy for "Add a copy". */
	create(): T;
	copy(data: T): T;
	/** Called once with a callback to use whenever the extension's own controls change data. */
	mount(context: { changed: () => void; current: () => { data: T; shape: ShapeInput } }): void;
	/** Show the selected shape's data in the extension's controls, and read the controls back. */
	write(data: T, shape: ShapeInput): void;
	read(data: T): void;
	/** Extra cut paths on a placed net (drawn before it, so inner cuts come first). */
	paths(data: T, shape: ShapeInput, net: Net): Path[];
	/** Notes about the selected shape. */
	notes(data: T, shape: ShapeInput): string[];
	/** Something to draw inside the shape in the 3D view. */
	view3d(data: T, shape: ShapeInput): FrameGeometry | null;
	/** Extra files to download with the sheet. */
	files(items: { data: T; shape: ShapeInput; label: string; index: number }[], name: string, date: Date): ExportFile[];
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const num = (id: string) => Number($<HTMLInputElement>(id).value);
const fmt = (mm: number) => `${mm.toFixed(1)} mm`;

const newLook = (): Look => ({
	fillOn: false,
	fill: '#9ecae1',
	sideMode: 'none',
	rotate: false,
	images: { strip: null, panels: [], topLid: null, bottomLid: null },
});

async function loadImage(file: File): Promise<HTMLImageElement> {
	const image = new Image();
	image.src = await readAsDataUrl(file);
	await image.decode();
	return image;
}

/** A copy of an image turned 180°, for artwork that should read upright on the folded shape. */
function rotated180(source: TextureSource): HTMLCanvasElement {
	const w = 'naturalWidth' in source ? source.naturalWidth : source.width;
	const h = 'naturalHeight' in source ? source.naturalHeight : source.height;
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d')!;
	ctx.translate(w, h);
	ctx.rotate(Math.PI);
	ctx.drawImage(source, 0, 0);
	return canvas;
}

const rotatedCache = new Map<TextureSource, HTMLCanvasElement>();
function turned(source: TextureSource | null, rotate: boolean): TextureSource | null {
	if (!source || !rotate) return source;
	let copy = rotatedCache.get(source);
	if (!copy) rotatedCache.set(source, (copy = rotated180(source)));
	return copy;
}

const aspectOf = (s: TextureSource | null) => (s ? ('naturalWidth' in s ? s.naturalWidth / s.naturalHeight : s.width / s.height) : null);

/** The printable sheet: fills, the net, and images rasterised at `dpi`, clipped to the page. */
export function printableSheet(net: Net, art: Artwork, imageFor: (slot: ImageSlot) => TextureSource | null, dpi: number): Sheet {
	const triangles: RasterTriangle[] = art.triangles.flatMap((t) => {
		const image = imageFor(t.slot);
		return image ? [{ points: t.points, uvs: t.uvs, image }] : [];
	});
	const bounds = trianglesBounds(triangles);
	const page = bounds && {
		minX: Math.max(0, bounds.minX),
		minY: Math.max(0, bounds.minY),
		maxX: Math.min(A4_LANDSCAPE.width, bounds.maxX),
		maxY: Math.min(A4_LANDSCAPE.height, bounds.maxY),
	};
	const forPrint = dpi === PRINT_DPI;
	const raster = page && page.maxX > page.minX && page.maxY > page.minY ? rasteriseTriangles(triangles, page, dpi, { transparent: !forPrint }) : null;
	return {
		paths: [...art.fills, ...net.sheet.paths],
		images: raster ? [toRasterImage(raster, forPrint ? 'image/jpeg' : 'image/png')] : [],
	};
}

/** A shape's printable sheet at `offset`, with `extra` cut paths (e.g. windows) first. */
function shapeSheet(shape: SheetShape, offset: Point, dpi: number, extra?: (net: Net) => Path[]): Sheet {
	const net = translateNet(buildNet(shape.input), offset);
	const sheet = shapeArtworkSheet(shape, net, dpi);
	return extra ? { ...sheet, paths: [...extra(net), ...sheet.paths] } : sheet;
}

function shapeArtworkSheet(shape: SheetShape, net: Net, dpi: number): Sheet {
	const { look } = shape;
	const art = buildArtwork(net, {
		fill: look.fillOn ? look.fill : null,
		sideMode: look.sideMode,
		panelImages: Array.from({ length: net.dims.sides }, (_, i) => !!look.images.panels[i]),
		topLidAspect: aspectOf(look.images.topLid),
		bottomLidAspect: aspectOf(look.images.bottomLid),
	});
	const imageFor = (slot: ImageSlot): TextureSource | null => {
		switch (slot.kind) {
			case 'strip':
				return turned(look.images.strip, look.rotate);
			case 'panel':
				return turned(look.images.panels[slot.index] ?? null, look.rotate);
			case 'topLid':
				return look.images.topLid;
			case 'bottomLid':
				return look.images.bottomLid;
		}
	};
	return printableSheet(net, art, imageFor, dpi);
}

export function startApp(ext?: AppExtension<any>): void {
	const view = new ShapeView3D($('view3d'));
	const shapes: SheetShape[] = [{ label: 'Shape 1', input: { ...DEFAULT_INPUT }, lock: true, look: newLook(), offset: [0, 0], include: true, version: 0, ext: ext?.create() }];
	const extraPaths = (shape: SheetShape) => (ext ? (net: Net) => ext.paths(shape.ext, shape.input, net) : undefined);
	let selected = 0;
	let timer: number | undefined;
	/** Cached preview content per shape (at offset 0), so dragging only moves a group. */
	const previewCache = new Map<SheetShape, { key: string; svg: string; bounds: Bounds }>();

	const current = () => shapes[selected];

	// ── Form ↔ selected shape ────────────────────────────────────────────────
	const writeForm = () => {
		const s = current();
		const set = (id: string, v: number | string) => ($<HTMLInputElement>(id).value = String(v));
		set('sides', s.input.sides);
		set('topDiameter', s.input.topDiameter);
		set('bottomDiameter', s.input.bottomDiameter);
		set('height', s.input.height);
		set('tabDepth', s.input.tabDepth);
		set('flapDepth', s.input.flapDepth);
		set('flapTaper', s.input.flapTaper);
		set('label', s.label);
		$<HTMLInputElement>('lock').checked = s.lock;
		$<HTMLInputElement>('bottomDiameter').disabled = s.lock;
		$<HTMLInputElement>('fillOn').checked = s.look.fillOn;
		set('fill', s.look.fill);
		$<HTMLSelectElement>('sideMode').value = s.look.sideMode;
		$<HTMLInputElement>('rotate').checked = s.look.rotate;
		for (const id of ['stripImage', 'panelImages', 'topLidImage', 'bottomLidImage']) $<HTMLInputElement>(id).value = '';
		showImageFields();
		ext?.write(s.ext, s.input);
	};

	const readForm = () => {
		const s = current();
		s.lock = $<HTMLInputElement>('lock').checked;
		const top = num('topDiameter');
		// Show the bottom value that is actually used while it follows the top.
		if (s.lock) $<HTMLInputElement>('bottomDiameter').value = String(top);
		s.input = {
			sides: num('sides'),
			topDiameter: top,
			bottomDiameter: s.lock ? top : num('bottomDiameter'),
			height: num('height'),
			tabDepth: num('tabDepth'),
			flapDepth: num('flapDepth'),
			flapTaper: num('flapTaper'),
		};
		s.label = $<HTMLInputElement>('label').value;
		s.look.fillOn = $<HTMLInputElement>('fillOn').checked;
		s.look.fill = $<HTMLInputElement>('fill').value;
		s.look.sideMode = $<HTMLSelectElement>('sideMode').value as SideMode;
		s.look.rotate = $<HTMLInputElement>('rotate').checked;
		ext?.read(s.ext);
		$<HTMLInputElement>('bottomDiameter').disabled = s.lock;
	};

	const showImageFields = () => {
		const s = current();
		const mode = s.look.sideMode;
		$('stripField').hidden = mode !== 'strip';
		$('panelField').hidden = mode !== 'perPanel';
		$('lidFields').hidden = mode === 'none';
		$('rotateField').hidden = mode === 'none';
		$('imageHint').hidden = mode === 'none';
		const img = s.look.images;
		const have = [img.strip && 'strip', img.panels.some(Boolean) && `${img.panels.filter(Boolean).length} panel`, img.topLid && 'top lid', img.bottomLid && 'bottom lid']
			.filter(Boolean)
			.join(', ');
		$('imageStatus').textContent = have ? `Images on this shape: ${have}.` : '';
	};

	// ── Sheet ───────────────────────────────────────────────────────────────
	const previewOf = (shape: SheetShape) => {
		const i = shape.look.images;
		const key = JSON.stringify([shape.input, shape.look.fillOn, shape.look.fill, shape.look.sideMode, shape.look.rotate, shape.version, i.panels.length, shape.ext]);
		const cached = previewCache.get(shape);
		if (cached && cached.key === key) return cached;
		const entry = { key, svg: previewContent(shapeSheet(shape, [0, 0], PREVIEW_DPI, extraPaths(shape))), bounds: netBounds(buildNet(shape.input)) };
		previewCache.set(shape, entry);
		return entry;
	};

	const placedBounds = (shape: SheetShape): Bounds => {
		const b = previewOf(shape).bounds;
		return { minX: b.minX + shape.offset[0], minY: b.minY + shape.offset[1], maxX: b.maxX + shape.offset[0], maxY: b.maxY + shape.offset[1] };
	};

	const renderSheet = () => {
		const groups: string[] = [];
		const overlay: string[] = [];
		shapes.forEach((shape, i) => {
			if (!shape.include) return;
			const { svg } = previewOf(shape);
			const [dx, dy] = shape.offset;
			groups.push(`<g data-shape="${i}" transform="translate(${dx} ${dy})">${svg}</g>`);
			const b = placedBounds(shape);
			const isSelected = i === selected;
			overlay.push(
				`<rect data-shape="${i}" class="hit" x="${b.minX}" y="${b.minY}" width="${b.maxX - b.minX}" height="${b.maxY - b.minY}" fill="transparent" stroke="${isSelected ? SELECTED : 'none'}" stroke-width="2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"><title>${escapeXml(shape.label)}</title></rect>`,
			);
		});
		$('sheet').innerHTML = previewFrame(groups.join('\n'), { title: 'Sheet preview: drag a shape to move it', overlay: overlay.join('\n') });
	};

	const renderList = () => {
		const list = $('shapeList');
		list.replaceChildren(
			...shapes.map((shape, i) => {
				const li = document.createElement('li');
				li.className = i === selected ? 'selected' : '';
				const box = document.createElement('input');
				box.type = 'checkbox';
				box.checked = shape.include;
				box.title = 'On this sheet';
				box.addEventListener('change', () => {
					shape.include = box.checked;
					update();
				});
				const button = document.createElement('button');
				button.type = 'button';
				button.textContent = shape.label || `Shape ${i + 1}`;
				button.addEventListener('click', () => select(i));
				li.append(box, button);
				return li;
			}),
		);
		$<HTMLButtonElement>('removeShape').disabled = shapes.length <= 1;
		$('shapeCount').textContent = `${shapes.filter((s) => s.include).length} of ${shapes.length} on this sheet`;
	};

	const describe = () => {
		const s = current();
		const net = buildNet(s.input);
		const d = net.dims;
		const rows: [string, string][] = [
			['Perimeter, top / bottom', `${fmt(d.topPerimeter)} / ${fmt(d.bottomPerimeter)}`],
			['Side length, top / bottom', `${fmt(d.topSide)} / ${fmt(d.bottomSide)}`],
			['Panel height on the net', fmt(d.panelHeight)],
			['Folds to a height of', fmt(d.foldedHeight)],
		];
		$('facts').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');

		const notes: string[] = [];
		const onSheet = shapes.map((shape, i) => ({ shape, i })).filter(({ shape }) => shape.include);
		const bounds = onSheet.map(({ shape }) => placedBounds(shape));
		const name = (k: number) => `<strong>${escapeXml(onSheet[k].shape.label || `Shape ${onSheet[k].i + 1}`)}</strong>`;
		bounds.forEach((b, k) => {
			if (!insideCutArea(b)) notes.push(`${name(k)} lies (partly) outside the 280 × 200 mm cutting area, so the cutter will not cut all of it. Move it, make it smaller, or take it off this sheet.`);
			else if (touchesCrossZone(b)) notes.push(`${name(k)} reaches a corner where a calibration cross is cut. Move it away from the corner.`);
		});
		for (const [a, b] of overlappingPairs(bounds)) notes.push(`${name(a)} and ${name(b)} overlap. Move one of them.`);
		if (Math.abs(d.foldedHeight - d.height) > 0.05) {
			notes.push(
				`The selected frustum folds to <strong>${fmt(d.foldedHeight)}</strong>, not the ${fmt(d.height)} you entered. That is how the Processing version builds frustum panels; this web version keeps its nets identical.`,
			);
		}
		const clamped: string[] = [];
		if (d.tabDepth < s.input.tabDepth - 1e-9) clamped.push(`tab depth to ${fmt(d.tabDepth)}`);
		if (d.flapDepth < s.input.flapDepth - 1e-9) clamped.push(`flap depth to ${fmt(d.flapDepth)}`);
		if (d.flapTaper < s.input.flapTaper - 1e-9) clamped.push(`flap taper to ${fmt(d.flapTaper)}`);
		if (clamped.length) notes.push(`Limited ${clamped.join(', ')} to fit the selected shape's panels.`);
		if (ext) notes.push(...ext.notes(s.ext, s.input));
		$('notes').innerHTML = notes.map((n) => `<p>${n}</p>`).join('');
		$('notes').hidden = notes.length === 0;
		$('panelCount').textContent = String(d.sides);

		const look = s.look;
		view.update(d, {
			fill: look.fillOn ? look.fill : null,
			sideMode: look.sideMode,
			strip: turned(look.images.strip, look.rotate),
			panels: Array.from({ length: d.sides }, (_, i) => turned(look.images.panels[i] ?? null, look.rotate)),
			topLid: look.images.topLid,
			bottomLid: look.images.bottomLid,
		}, ext ? ext.view3d(s.ext, s.input) : null);
	};

	const update = () => {
		renderList();
		renderSheet();
		describe();
	};

	const schedule = () => {
		window.clearTimeout(timer);
		timer = window.setTimeout(update, 120);
	};

	const select = (i: number) => {
		selected = Math.max(0, Math.min(i, shapes.length - 1));
		writeForm();
		update();
	};

	/** Put a new shape in a free spot next to the shapes already on the sheet (they stay put). */
	const placeNew = (shape: SheetShape) => {
		const placed = shapes.filter((s) => s.include && s !== shape).map(placedBounds);
		const offset = offsetIntoFreeSpot(placed, previewOf(shape).bounds);
		if (offset) shape.offset = offset;
		else {
			shape.include = false;
			$('status').textContent = 'The new shape does not fit on this sheet; it was added to the list but not to the sheet.';
		}
	};

	// ── Events: form ────────────────────────────────────────────────────────
	$('controls').addEventListener('input', (event) => {
		const target = event.target as HTMLElement;
		if (target.closest('#sheetFields')) return;
		readForm();
		if ((target as HTMLInputElement).id === 'sideMode') showImageFields();
		schedule();
	});
	$('controls').addEventListener('change', (event) => {
		const target = event.target as HTMLElement;
		if (target.closest('#sheetFields') || (target as HTMLInputElement).type === 'file') return;
		readForm();
		showImageFields();
		schedule();
	});
	$('resetView').addEventListener('click', () => {
		view.reset();
		describe();
	});

	const onImage = (id: string, apply: (images: Images, files: File[]) => Promise<void>) =>
		$<HTMLInputElement>(id).addEventListener('change', async (event) => {
			const files = [...((event.target as HTMLInputElement).files ?? [])];
			const shape = current();
			try {
				await apply(shape.look.images, files);
				shape.version++;
			} catch {
				$('status').textContent = 'That file could not be read as an image.';
			}
			showImageFields();
			update();
		});
	onImage('stripImage', async (img, [file]) => void (img.strip = file ? await loadImage(file) : null));
	onImage('panelImages', async (img, files) => void (img.panels = await Promise.all(files.map(loadImage))));
	onImage('topLidImage', async (img, [file]) => void (img.topLid = file ? await loadImage(file) : null));
	onImage('bottomLidImage', async (img, [file]) => void (img.bottomLid = file ? await loadImage(file) : null));

	// ── Events: shapes on the sheet ──────────────────────────────────────────
	$('addShape').addEventListener('click', () => {
		const base = current();
		const copy: SheetShape = {
			label: `Shape ${shapes.length + 1}`,
			input: { ...base.input },
			lock: base.lock,
			look: { ...base.look, images: { ...base.look.images, panels: [...base.look.images.panels] } },
			offset: [0, 0],
			include: true,
			version: base.version,
			ext: ext ? ext.copy(base.ext) : undefined,
		};
		shapes.push(copy);
		placeNew(copy);
		select(shapes.length - 1);
	});
	$('removeShape').addEventListener('click', () => {
		if (shapes.length <= 1) return;
		shapes.splice(selected, 1);
		select(Math.min(selected, shapes.length - 1));
	});
	$('arrange').addEventListener('click', () => {
		const onSheet = shapes.filter((s) => s.include);
		const offsets = arrangeOffsets(onSheet.map((s) => previewOf(s).bounds));
		onSheet.forEach((s, k) => (s.offset = offsets[k]));
		update();
	});

	const importText = (text: string, source: string, replace: boolean) => {
		try {
			const { shapes: imported, skipped } = importShapes(text, current().input);
			const added = imported.map(
				(s, k): SheetShape => ({
					label: s.label || `Shape ${k + 1}`,
					input: s.input,
					lock: true,
					look: { ...newLook(), fillOn: s.fill !== null, fill: s.fill ?? '#9ecae1' },
					offset: [0, 0],
					include: true,
					version: 0,
					ext: ext?.create(),
				}),
			);
			if (replace) shapes.splice(0, shapes.length);
			shapes.push(...added);
			const onSheet = shapes.filter((s) => s.include);
			const offsets = arrangeOffsets(onSheet.map((s) => previewOf(s).bounds));
			onSheet.forEach((s, k) => (s.offset = offsets[k]));
			const off = onSheet.filter((s) => !insideCutArea(placedBounds(s)));
			for (const s of off) s.include = false;
			$('status').textContent =
				`Imported ${added.length} shape${added.length === 1 ? '' : 's'} from ${source}.` +
				(off.length ? ` ${off.length} did not fit and were taken off this sheet (tick them to add them back).` : '') +
				(skipped.length ? ` Skipped: ${skipped.join(' ')}` : '');
			select(replace ? 0 : shapes.length - added.length);
		} catch (error) {
			$('status').textContent = error instanceof Error ? error.message : String(error);
		}
	};
	$<HTMLInputElement>('importJson').addEventListener('change', async (event) => {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const untouched = shapes.length === 1 && JSON.stringify(shapes[0].input) === JSON.stringify(DEFAULT_INPUT);
		const replace = untouched || window.confirm('Replace the shapes on this sheet with the imported ones?\n\nOK: replace. Cancel: add them to the sheet.');
		importText(await readAsText(file), file.name, replace);
		(event.target as HTMLInputElement).value = '';
	});

	// ── Dragging on the sheet ────────────────────────────────────────────────
	const sheetBox = $('sheet');
	let drag: { index: number; start: Point; offset: Point; moved: boolean; pointer: number } | null = null;
	const toMm = (event: PointerEvent): Point | null => {
		const svg = sheetBox.querySelector('svg');
		const ctm = svg?.getScreenCTM();
		if (!svg || !ctm) return null;
		const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
		return [p.x, p.y];
	};
	sheetBox.addEventListener('pointerdown', (event) => {
		const hit = (event.target as Element).closest('[data-shape].hit');
		const at = toMm(event);
		if (!hit || !at) return;
		const index = Number(hit.getAttribute('data-shape'));
		if (index !== selected) {
			selected = index;
			writeForm();
			renderList();
			describe();
		}
		drag = { index, start: at, offset: [...shapes[index].offset], moved: false, pointer: event.pointerId };
		sheetBox.setPointerCapture(event.pointerId);
		event.preventDefault();
	});
	sheetBox.addEventListener('pointermove', (event) => {
		if (!drag || event.pointerId !== drag.pointer) return;
		const at = toMm(event);
		if (!at) return;
		const dx = Math.round((at[0] - drag.start[0]) * 2) / 2; // 0.5 mm steps
		const dy = Math.round((at[1] - drag.start[1]) * 2) / 2;
		const shape = shapes[drag.index];
		shape.offset = [drag.offset[0] + dx, drag.offset[1] + dy];
		drag.moved = true;
		const group = sheetBox.querySelector(`g[data-shape="${drag.index}"]`);
		group?.setAttribute('transform', `translate(${shape.offset[0]} ${shape.offset[1]})`);
		const b = placedBounds(shape);
		const rect = sheetBox.querySelector(`rect[data-shape="${drag.index}"]`);
		rect?.setAttribute('x', String(b.minX));
		rect?.setAttribute('y', String(b.minY));
	});
	const endDrag = (event: PointerEvent) => {
		if (!drag || event.pointerId !== drag.pointer) return;
		const moved = drag.moved;
		drag = null;
		if (moved) update();
		else renderSheet();
	};
	sheetBox.addEventListener('pointerup', endDrag);
	sheetBox.addEventListener('pointercancel', endDrag);
	sheetBox.addEventListener('keydown', (event) => {
		const step = event.shiftKey ? 5 : 1;
		const moves: Record<string, Point> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
		const move = moves[event.key];
		if (!move) return;
		event.preventDefault();
		const shape = current();
		shape.offset = [shape.offset[0] + move[0], shape.offset[1] + move[1]];
		update();
	});

	// ── Export ──────────────────────────────────────────────────────────────
	const button = $<HTMLButtonElement>('export');
	button.addEventListener('click', async () => {
		const onSheet = shapes.filter((s) => s.include);
		if (onSheet.length === 0) {
			$('status').textContent = 'No shapes on this sheet: tick at least one in the list.';
			return;
		}
		button.disabled = true;
		$('status').textContent = 'Preparing files…';
		try {
			await new Promise((resolve) => setTimeout(resolve, 20)); // let the status paint
			const sheets = onSheet.map((s) => shapeSheet(s, s.offset, PRINT_DPI, extraPaths(s)));
			const sheet: Sheet = { paths: sheets.flatMap((s) => s.paths), images: sheets.flatMap((s) => s.images ?? []) };
			const name = $<HTMLInputElement>('name').value;
			const date = new Date();
			const files = [
				...buildExportFiles(sheet, name, date),
				...(ext ? ext.files(onSheet.map((s) => ({ data: s.ext, shape: s.input, label: s.label, index: shapes.indexOf(s) })), name, date) : []),
			];
			await downloadAll(files);
			$('status').textContent = `Downloaded ${files.map((f) => f.name).join(', ')}.`;
		} catch (error) {
			$('status').textContent = `Something went wrong: ${error instanceof Error ? error.message : String(error)}`;
		} finally {
			button.disabled = false;
		}
	});

	// ── Start ───────────────────────────────────────────────────────────────
	ext?.mount({
		changed: () => {
			readForm();
			schedule();
		},
		current: () => ({ data: current().ext, shape: current().input }),
	});
	writeForm();
	update();
	if (new URLSearchParams(window.location.search).get('import') === 'handoff') {
		const handoff = takeHandoff();
		if (handoff) importText(handoff.json, handoff.from, true);
		history.replaceState(null, '', window.location.pathname);
	}
}

