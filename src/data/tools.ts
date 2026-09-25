import toolsJson from './tools.json';

export const CATEGORIES = ['maker', 'visualisation'] as const;
export const STATUSES = ['planned', 'in-progress', 'available'] as const;

export type ToolCategory = (typeof CATEGORIES)[number];
export type ToolStatus = (typeof STATUSES)[number];

export interface Tool {
	/** Lowercase slug. Used in URLs: /tools/<id>/ and /tutorials/<id>/. */
	id: string;
	name: string;
	category: ToolCategory;
	status: ToolStatus;
	description: string;
	/** The tool's folder in the PaperPrototyping (Processing) repo, or null when the Processing
	 * sketch is not online (see `sourceNote`). */
	processingUrl: string | null;
	/** Where the Processing source lives when it is not online, e.g. a local folder. */
	sourceNote: string | null;
	/** Path of the web app relative to the site base, e.g. "apps/frustumsupport/". Null until it exists. */
	appPath: string | null;
	/** Reserved. Tutorials are discovered from src/content/docs/tutorials/<id>/, see CLAUDE.md. */
	tutorials: string[];
}

// tools.json is checked against this shape by tests/data/tools.test.ts.
export const tools = toolsJson as Tool[];

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
	maker: 'Maker tools',
	visualisation: 'Visualisation tools',
};

export const STATUS_LABELS: Record<ToolStatus, string> = {
	planned: 'Planned',
	'in-progress': 'In progress',
	available: 'Available',
};

export function toolsInCategory(category: ToolCategory): Tool[] {
	return tools.filter((tool) => tool.category === category);
}

export function getTool(id: string): Tool {
	const tool = tools.find((t) => t.id === id);
	if (!tool) throw new Error(`Unknown tool id "${id}". Check src/data/tools.json.`);
	return tool;
}
