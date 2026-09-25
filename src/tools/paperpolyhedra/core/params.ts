// PaperPolyhedra inputs and the dimensions derived from them, ported from the Processing
// sketch (UI.pde applyToModel(), Param.pde setParams()). All values in mm.

export interface ShapeInput {
	/** Number of sides, 3 or more. */
	sides: number;
	/**
	 * "Top diameter" as in the Processing UI: the side length when sides = 4, otherwise the
	 * diameter of the circle through the corners (circumscribed diameter).
	 */
	topDiameter: number;
	/** "Bottom diameter", same meaning as `topDiameter`. */
	bottomDiameter: number;
	/** Height as entered. See `ShapeDims.foldedHeight` for what the net actually folds to. */
	height: number;
	/** How far the tabs stick out. */
	tabDepth: number;
	/** Depth of the glue flap and hook tab that close the strip. */
	flapDepth: number;
	/** How much the glue flap narrows towards its outer edge. */
	flapTaper: number;
}

/**
 * Starting shape for the web app. Processing starts at Ø40 × 100 mm (Param.pde, UI.pde), whose
 * lids fall outside the cutting area. Tab depth 10 mm is one of Processing's presets (its
 * default, 15 mm, would be limited to half the 25 mm side); flaps use Processing's defaults.
 */
export const DEFAULT_INPUT: ShapeInput = {
	sides: 6,
	topDiameter: 50,
	bottomDiameter: 50,
	height: 50,
	tabDepth: 10,
	flapDepth: 5,
	flapTaper: 5,
};

/** Tab neck as a fraction of tab depth: strip tabs, lid tabs and the hook tab. */
export const STRIP_TAB_NECK_RATIO = 0.8;
export const LID_TAB_NECK_RATIO = 0.2;
export const HOOK_NECK_RATIO = 0.2;

/**
 * The hook tab's barb offset. Processing sets `hookOffset = -1` mm but converts it with the
 * print scale `MM` even when drawing the cut file at `MM_V`, so the cut file (which is what
 * gets cut) has −1 × 72/96 = −0.75 mm. The web version uses the cut value on both files.
 */
export const HOOK_OFFSET_MM = -1 * (72 / 96);

/** Pattern origin on the page (Processing `patX`, `patY`). */
export const PATTERN_ORIGIN = [10, 20] as const;

/** Perimeter from the UI "diameter" (UI.pde applyToModel()). */
export function perimeterFromDiameter(sides: number, diameter: number): number {
	const d = Math.max(1, diameter);
	return sides === 4 ? 4 * d : sides * d * Math.sin(Math.PI / sides);
}

/** Circumradius of a regular polygon with the given side length. */
export function circumradius(sides: number, side: number): number {
	return side / 2 / Math.sin(Math.PI / sides);
}

/** Apothem (centre to middle of a side) of a regular polygon with the given side length. */
export function apothem(sides: number, side: number): number {
	return side / (2 * Math.tan(Math.PI / sides));
}

export interface ShapeDims {
	sides: number;
	topPerimeter: number;
	bottomPerimeter: number;
	topSide: number;
	bottomSide: number;
	height: number;
	/**
	 * Panel height on the net. Processing uses √(h² + (bottom side − top side)²), which is not
	 * the true slant height of a frustum face (that uses the apothem difference). Kept exactly
	 * as Processing does it, by decision; see docs/hidden-behaviour.md.
	 */
	panelHeight: number;
	/** The vertical height the net really folds to; differs from `height` for frustums. */
	foldedHeight: number;
	/** Clamped as in setParams(): at most half a side and half the panel height. */
	tabDepth: number;
	/** Clamped: at most half a side. */
	flapDepth: number;
	/** Clamped: at most 0.33 × panel height. */
	flapTaper: number;
}

/** Validate and normalise inputs the way the Processing UI does (min 3 sides, min 1 mm). */
export function normaliseInput(input: ShapeInput): ShapeInput {
	return {
		sides: Math.max(3, Math.round(input.sides)),
		topDiameter: Math.max(1, input.topDiameter),
		bottomDiameter: Math.max(1, input.bottomDiameter),
		height: Math.max(1, input.height),
		tabDepth: Math.max(0, input.tabDepth),
		flapDepth: Math.max(0, input.flapDepth),
		flapTaper: Math.max(0, input.flapTaper),
	};
}

export function shapeDims(raw: ShapeInput): ShapeDims {
	const input = normaliseInput(raw);
	const n = input.sides;
	const topPerimeter = perimeterFromDiameter(n, input.topDiameter);
	const bottomPerimeter = perimeterFromDiameter(n, input.bottomDiameter);
	const topSide = topPerimeter / n;
	const bottomSide = bottomPerimeter / n;
	const panelHeight = Math.hypot(input.height, bottomSide - topSide);
	const apothemDiff = apothem(n, bottomSide) - apothem(n, topSide);
	const foldedHeight = Math.sqrt(Math.max(0, panelHeight ** 2 - apothemDiff ** 2));

	return {
		sides: n,
		topPerimeter,
		bottomPerimeter,
		topSide,
		bottomSide,
		height: input.height,
		panelHeight,
		foldedHeight,
		tabDepth: Math.min(input.tabDepth, topSide * 0.5, bottomSide * 0.5, panelHeight * 0.5),
		flapDepth: Math.min(input.flapDepth, topSide * 0.5, bottomSide * 0.5),
		flapTaper: input.flapTaper > panelHeight * 0.33 ? panelHeight * 0.33 : input.flapTaper,
	};
}
