// Checks the built site in dist/ for links that break on GitHub Pages.
//
// Every internal href/src must start with the deploy base (/PaperPrototypingWeb/)
// or be relative, must point to a file that exists in dist/, and, if it has a
// #fragment, the target page must contain that id. Runs as the last step of
// `npm run build`, so a broken link fails the build and blocks the deploy.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';

const DIST = 'dist';
const BASE = '/PaperPrototypingWeb/';
// Starlight's "back to top" target lives in the layout, not in page content.
const ALWAYS_PRESENT_IDS = new Set(['_top']);

function walk(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		return entry.isDirectory() ? walk(path) : [path];
	});
}

/** The URL path a page in dist/ is served at, e.g. dist/tools/x/index.html → /PaperPrototypingWeb/tools/x/index.html */
function urlOf(file) {
	return BASE + relative(DIST, file).split(sep).join('/');
}

/** The dist/ file a URL path under BASE resolves to, or null. */
function fileFor(urlPath) {
	const rest = decodeURIComponent(urlPath.slice(BASE.length));
	const candidates = rest === '' || rest.endsWith('/') ? [join(rest, 'index.html')] : [rest, join(rest, 'index.html'), `${rest}.html`];
	for (const candidate of candidates) {
		const path = join(DIST, candidate);
		if (existsSync(path) && statSync(path).isFile()) return path;
	}
	return null;
}

const idCache = new Map();
function hasId(file, id) {
	if (!idCache.has(file)) {
		const ids = new Set([...readFileSync(file, 'utf8').matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]));
		idCache.set(file, ids);
	}
	return idCache.get(file).has(id);
}

if (!existsSync(DIST)) {
	console.error('check-links: dist/ not found, run the build first.');
	process.exit(1);
}

const pages = walk(DIST).filter((file) => file.endsWith('.html'));
const errors = [];
let checked = 0;

for (const page of pages) {
	const html = readFileSync(page, 'utf8');
	const pageUrl = urlOf(page);
	for (const [, attr, raw] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
		const value = raw.replaceAll('&amp;', '&');
		if (value === '' || /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) continue; // external, mailto:, data:, …

		const [pathPart, fragment] = value.split('#');
		const withoutQuery = pathPart.split('?')[0];
		const resolved = withoutQuery === '' ? pageUrl : withoutQuery.startsWith('/') ? withoutQuery : posix.join(posix.dirname(pageUrl), withoutQuery) + (withoutQuery.endsWith('/') ? '/' : '');
		const where = `${relative(DIST, page)}: ${attr}="${raw}"`;
		checked++;

		if (!resolved.startsWith(BASE)) {
			errors.push(`${where} is outside the base ${BASE}`);
			continue;
		}
		const target = fileFor(resolved);
		if (!target) {
			errors.push(`${where} points to a missing file`);
			continue;
		}
		if (fragment && target.endsWith('.html') && !ALWAYS_PRESENT_IDS.has(fragment) && !hasId(target, decodeURIComponent(fragment))) {
			errors.push(`${where} points to a missing #${fragment}`);
		}
	}
}

if (errors.length > 0) {
	console.error(`check-links: ${errors.length} broken link(s):\n  ${errors.join('\n  ')}`);
	process.exit(1);
}
console.log(`check-links: ${checked} internal links in ${pages.length} pages OK under ${BASE}`);
