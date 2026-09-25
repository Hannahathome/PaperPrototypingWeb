import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tools } from '../../src/data/tools';

const DOCS = 'src/content/docs';
const MAX_IMAGE_BYTES = 500 * 1024;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|svg)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|avi|mkv|webm|wmv|mpe?g)$/i;

function walk(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		return entry.isDirectory() ? walk(path) : [path];
	});
}

describe('tool pages', () => {
	it.each(tools)('$id has a page whose title matches tools.json', (tool) => {
		const file = join(DOCS, 'tools', `${tool.id}.mdx`);
		expect(existsSync(file), `missing ${file}`).toBe(true);
		expect(readFileSync(file, 'utf8')).toMatch(new RegExp(`^title: ${tool.name}$`, 'm'));
	});
});

describe('tutorials', () => {
	const ids = tools.map((tool) => tool.id);
	const folders = readdirSync(join(DOCS, 'tutorials'), { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);

	it.each(folders)('folder "%s" is a tool id from tools.json', (folder) => {
		expect(ids).toContain(folder);
	});

	it('template exists and has the required sections', () => {
		const template = readFileSync(join(DOCS, 'tutorials', '_template.md'), 'utf8');
		for (const section of ['Goal', 'What you need', 'Steps', 'Common problems', 'Last checked']) {
			expect(template).toMatch(new RegExp(`^## ${section}$`, 'm'));
		}
	});
});

describe('assets', () => {
	const files = [...walk('src'), ...walk('public')];

	it('contains no video files (embed from YouTube or Vimeo instead)', () => {
		expect(files.filter((file) => VIDEO_EXT.test(file))).toEqual([]);
	});

	it('keeps every image under 500 KB', () => {
		const tooLarge = files
			.filter((file) => IMAGE_EXT.test(file) && statSync(file).size > MAX_IMAGE_BYTES)
			.map((file) => `${relative('.', file)} (${Math.round(statSync(file).size / 1024)} KB)`);
		expect(tooLarge).toEqual([]);
	});
});
