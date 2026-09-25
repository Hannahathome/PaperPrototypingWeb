// PaperPolyhedra web app: reads the form, asks the core for the net, and shows it. Everything
// geometric comes from ../core; this file only displays and exports what the core returns.
import type { Sheet } from '../../../lib/drawing';
import { buildExportFiles } from '../../../lib/export';
import { downloadAll, readAsDataUrl } from '../../../lib/files';
import { previewSvg } from '../../../lib/preview';
import { PRINT_DPI, rasteriseTriangles, toRasterImage, trianglesBounds, type RasterTriangle, type TextureSource } from '../../../lib/raster';
import { A4_LANDSCAPE } from '../../../lib/units';
import { buildArtwork, type Artwork, type ImageSlot, type SideMode } from '../core/artwork';
import { buildNet, type Net } from '../core/net';
import type { ShapeInput } from '../core/params';
import { ShapeView3D } from './view3d';

const PREVIEW_DPI = 60;

interface Images {
	strip: TextureSource | null;
	panels: (TextureSource | null)[];
	topLid: TextureSource | null;
	bottomLid: TextureSource | null;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const num = (id: string) => Number($<HTMLInputElement>(id).value);

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

const aspectOf =(s: TextureSource | null) => (s ? ('naturalWidth' in s ? s.naturalWidth / s.naturalHeight : s.width / s.height) : null);
const fmt = (mm: number) => `${mm.toFixed(1)} mm`;

export function startApp(): void {
	const raw: Images = { strip: null, panels: [], topLid: null, bottomLid: null };
	const rotatedCache = new Map<TextureSource, HTMLCanvasElement>();
	const view = new ShapeView3D($('view3d'));
	let timer: number | undefined;

	const readInput = (): ShapeInput => {
		const lock = $<HTMLInputElement>('lock').checked;
		const top = num('topDiameter');
		return {
			sides: num('sides'),
			topDiameter: top,
			bottomDiameter: lock ? top : num('bottomDiameter'),
			height: num('height'),
			tabDepth: num('tabDepth'),
			flapDepth: num('flapDepth'),
			flapTaper: num('flapTaper'),
		};
	};

	const sideMode = (): SideMode => ($<HTMLSelectElement>('sideMode').value as SideMode) ?? 'none';
	const fill = (): string | null => ($<HTMLInputElement>('fillOn').checked ? $<HTMLInputElement>('fill').value : null);

	/** Side images as they will be printed (turned 180° when asked). */
	const side = (source: TextureSource | null): TextureSource | null => {
		if (!source || !$<HTMLInputElement>('rotate').checked) return source;
		let turned = rotatedCache.get(source);
		if (!turned) rotatedCache.set(source, (turned = rotated180(source)));
		return turned;
	};

	const imageFor = (slot: ImageSlot): TextureSource | null => {
		switch (slot.kind) {
			case 'strip':
				return side(raw.strip);
			case 'panel':
				return side(raw.panels[slot.index] ?? null);
			case 'topLid':
				return raw.topLid;
			case 'bottomLid':
				return raw.bottomLid;
		}
	};

	const artworkFor = (net: Net) =>
		buildArtwork(net, {
			fill: fill(),
			sideMode: sideMode(),
			panelImages: Array.from({ length: net.dims.sides }, (_, i) => !!raw.panels[i]),
			topLidAspect: aspectOf(raw.topLid),
			bottomLidAspect: aspectOf(raw.bottomLid),
		});

	const sheetFor = (net: Net, dpi: number): Sheet => printableSheet(net, artworkFor(net), imageFor, dpi);

	const describe = (net: Net, input: ShapeInput) => {
		const d = net.dims;
		const rows: [string, string][] = [
			['Perimeter, top / bottom', `${fmt(d.topPerimeter)} / ${fmt(d.bottomPerimeter)}`],
			['Side length, top / bottom', `${fmt(d.topSide)} / ${fmt(d.bottomSide)}`],
			['Panel height on the net', fmt(d.panelHeight)],
			['Folds to a height of', fmt(d.foldedHeight)],
		];
		$('facts').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');

		const notes: string[] = [];
		if (!net.fitsCutArea) {
			notes.push('<strong>Part of the net lies outside the 280 × 200 mm cutting area</strong>, so the cutter will not cut it. Make the shape smaller or lower. (The Processing version lays it out the same way.)');
		}
		if (Math.abs(d.foldedHeight - d.height) > 0.05) {
			notes.push(
				`This frustum folds to <strong>${fmt(d.foldedHeight)}</strong>, not the ${fmt(d.height)} you entered. That is how the Processing version builds frustum panels; this web version keeps its nets identical.`,
			);
		}
		const clamped: string[] = [];
		if (d.tabDepth < input.tabDepth - 1e-9) clamped.push(`tab depth to ${fmt(d.tabDepth)}`);
		if (d.flapDepth < input.flapDepth - 1e-9) clamped.push(`flap depth to ${fmt(d.flapDepth)}`);
		if (d.flapTaper < input.flapTaper - 1e-9) clamped.push(`flap taper to ${fmt(d.flapTaper)}`);
		if (clamped.length) notes.push(`Limited ${clamped.join(', ')} to fit the panels.`);
		const noteBox = $('notes');
		noteBox.innerHTML = notes.map((n) => `<p>${n}</p>`).join('');
		noteBox.hidden = notes.length === 0;
	};

	const update = () => {
		const input = readInput();
		const net = buildNet(input);
		describe(net, input);
		$('sheet').innerHTML = previewSvg(sheetFor(net, PREVIEW_DPI), { title: 'Net preview on an A4 sheet' });
		view.update(net.dims, {
			fill: fill(),
			sideMode: sideMode(),
			strip: side(raw.strip),
			panels: Array.from({ length: net.dims.sides }, (_, i) => side(raw.panels[i] ?? null)),
			topLid: raw.topLid,
			bottomLid: raw.bottomLid,
		});
		$('panelCount').textContent = String(net.dims.sides);
	};

	const schedule = () => {
		window.clearTimeout(timer);
		timer = window.setTimeout(update, 120);
	};

	// Inputs.
	$<HTMLInputElement>('lock').addEventListener('change', () => {
		$<HTMLInputElement>('bottomDiameter').disabled = $<HTMLInputElement>('lock').checked;
		schedule();
	});
	$('controls').addEventListener('input', schedule);
	$('controls').addEventListener('change', schedule);
	$('sideMode').addEventListener('change', () => {
		const mode = sideMode();
		$('stripField').hidden = mode !== 'strip';
		$('panelField').hidden = mode !== 'perPanel';
		$('lidFields').hidden = mode === 'none';
		$('rotateField').hidden = mode === 'none';
		$('imageHint').hidden = mode === 'none';
	});
	$('resetView').addEventListener('click', () => {
		view.reset();
		update();
	});

	const onFile = (id: string, apply: (files: File[]) => Promise<void>) =>
		$<HTMLInputElement>(id).addEventListener('change', async (event) => {
			const files = [...((event.target as HTMLInputElement).files ?? [])];
			try {
				await apply(files);
			} catch {
				$('status').textContent = 'That file could not be read as an image.';
			}
			update();
		});
	onFile('stripImage', async ([file]) => void (raw.strip = file ? await loadImage(file) : null));
	onFile('panelImages', async (files) => void (raw.panels = await Promise.all(files.map(loadImage))));
	onFile('topLidImage', async ([file]) => void (raw.topLid = file ? await loadImage(file) : null));
	onFile('bottomLidImage', async ([file]) => void (raw.bottomLid = file ? await loadImage(file) : null));

	// Export.
	const button = $<HTMLButtonElement>('export');
	button.addEventListener('click', async () => {
		button.disabled = true;
		$('status').textContent = 'Preparing files…';
		try {
			await new Promise((resolve) => setTimeout(resolve, 20)); // let the status paint
			const net = buildNet(readInput());
			const files = buildExportFiles(sheetFor(net, PRINT_DPI), $<HTMLInputElement>('name').value);
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
