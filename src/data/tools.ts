import toolsJson from './tools.json';

export const CATEGORIES = ['maker', 'visualisation'] as const;
export const STATUSES = ['planned', 'in-progress', 'available'] as const;
/** Groups of maker tools, in the order the home page and sidebar show them. */
export const MAKER_GROUPS = ['paper', 'strut', 'combined', 'support', 'mini'] as const;

export type ToolCategory = (typeof CATEGORIES)[number];
export type MakerGroup = (typeof MAKER_GROUPS)[number];
export type ToolStatus = (typeof STATUSES)[number];

export interface Tool {
	/** Lowercase slug. Used in URLs: /tools/<id>/ and /tutorials/<id>/. */
	id: string;
	name: string;
	category: ToolCategory;
	/** Required for maker tools, null for visualisation tools. */
	group: MakerGroup | null;
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

export const MAKER_GROUP_LABELS: Record<MakerGroup, { label: string; blurb: string }> = {
	paper: { label: 'Paper tools', blurb: 'Print-and-cut nets that fold into paper blocks and shapes.' },
	strut: { label: 'Strut tools', blurb: 'A 3D-printable frame that goes inside a paper shape.' },
	combined: { label: 'Combined tools', blurb: 'A paper shell and its printed frame, designed together.' },
	support: { label: 'Support tools', blurb: 'Tools that prepare input for the others.' },
	mini: { label: 'Mini tools', blurb: 'Small tools for one kind of block, built on the paper tools.' },
};

export const STATUS_LABELS: Record<ToolStatus, string> = {
	planned: 'Planned',
	'in-progress': 'In progress',
	available: 'Available',
};

export function toolsInCategory(category: ToolCategory): Tool[] {
	return tools.filter((tool) => tool.category === category);
}

export function toolsInGroup(group: MakerGroup): Tool[] {
	return tools.filter((tool) => tool.category === 'maker' && tool.group === group);
}

export function getTool(id: string): Tool {
	const tool = tools.find((t) => t.id === id);
	if (!tool) throw new Error(`Unknown tool id "${id}". Check src/data/tools.json.`);
	return tool;
}
