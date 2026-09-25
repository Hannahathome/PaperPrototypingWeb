// JSON shape import, ported from PaperPolyhedra json_import.pde (buildShapeFromJSON). A file is
// a JSON array of objects; each becomes a prism (top = bottom). Missing or invalid fields fall
// back to Processing's defaults, and unknown keys (e.g. DataPhysicalisation's width/depth) are
// ignored. Tab and flap settings are not in the file: the current ones are used.
import { normaliseInput, type ShapeInput } from './params';

export interface ImportedShape {
	label: string;
	input: ShapeInput;
	/** Fill colour from "color" ("#RRGGBB"), or null. */
	fill: string | null;
}

export const IMPORT_DEFAULTS = { sides: 4, diameter: 30, height: 30 } as const;

/** parseHexColor: "#RRGGBB" (with or without #); anything else becomes white, as in Processing. */
export function parseHexColour(text: string): string {
	const hex = text.trim().replace(/#/g, '');
	return /^[0-9a-fA-F]{6}$/.test(hex) ? `#${hex.toUpperCase()}` : '#FFFFFF';
}

function number(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export interface ImportResult {
	shapes: ImportedShape[];
	/** Entries that were skipped, with the reason. */
	skipped: string[];
}

/** Read a PaperPolyhedra / DataPhysicalisation shapes file. Throws when it is not a JSON array. */
export function importShapes(text: string, tabs: Pick<ShapeInput, 'tabDepth' | 'flapDepth' | 'flapTaper'>): ImportResult {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch (error) {
		throw new Error(`Could not read the JSON file: ${error instanceof Error ? error.message : String(error)}`);
	}
	if (!Array.isArray(data) || data.length === 0) throw new Error('The JSON file is empty or not a JSON array.');

	const shapes: ImportedShape[] = [];
	const skipped: string[] = [];
	data.forEach((entry, i) => {
		if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
			skipped.push(`Entry ${i + 1} is not an object.`);
			return;
		}
		const e = entry as Record<string, unknown>;
		// Processing reads sides with getInt: a fractional value is truncated.
		const sides = Math.max(3, Math.trunc(number(e.sides, IMPORT_DEFAULTS.sides)));
		const diameter = Math.max(1, number(e.diameter, IMPORT_DEFAULTS.diameter));
		const height = Math.max(1, number(e.height, IMPORT_DEFAULTS.height));
		const colour = typeof e.color === 'string' && e.color !== '' ? parseHexColour(e.color) : null;
		shapes.push({
			label: typeof e.label === 'string' ? e.label : '',
			input: normaliseInput({ sides, topDiameter: diameter, bottomDiameter: diameter, height, ...tabs }),
			fill: colour,
		});
	});
	return { shapes, skipped };
}
