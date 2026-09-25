/**
 * Prefix a site-internal path with the deploy base ("/PaperPrototypingWeb/").
 *
 * Use this for every internal link or asset path built in .astro/.ts code;
 * a bare "/tools/x/" would 404 on GitHub Pages. Markdown content should use
 * relative links instead (see CLAUDE.md).
 */
export function withBase(path: string, base: string = import.meta.env.BASE_URL): string {
	const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
	const trimmedPath = path.startsWith('/') ? path.slice(1) : path;
	return `${trimmedBase}/${trimmedPath}`;
}
