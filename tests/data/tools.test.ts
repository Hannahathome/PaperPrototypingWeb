import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATEGORIES, MAKER_GROUP_LABELS, MAKER_GROUPS, STATUSES, tools } from '../../src/data/tools';

describe('tools.json', () => {
	it('has at least one tool', () => {
		expect(tools.length).toBeGreaterThan(0);
	});

	it('has unique, lowercase, URL-safe ids', () => {
		const ids = tools.map((tool) => tool.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
	});

	it('lists maker tools group by group, in the MAKER_GROUPS order', () => {
		const groups = tools.filter((t) => t.category === 'maker').map((t) => MAKER_GROUPS.indexOf(t.group!));
		expect(groups).toEqual([...groups].sort((a, b) => a - b));
	});

	it('keeps the sidebar groups in astro.config.mjs in step with MAKER_GROUPS', () => {
		const config = readFileSync('astro.config.mjs', 'utf8');
		const listed = [...config.matchAll(/\['([a-z]+)', '([^']+)'\]/g)].map((m) => [m[1], m[2]]);
		expect(listed).toEqual(MAKER_GROUPS.map((g) => [g, MAKER_GROUP_LABELS[g].label]));
	});

	describe.each(tools)('$id', (tool) => {
		it('has a valid category', () => {
			expect(CATEGORIES).toContain(tool.category);
		});

		it('has a maker group when it is a maker tool, none otherwise', () => {
			if (tool.category === 'maker') expect(MAKER_GROUPS).toContain(tool.group);
			else expect(tool.group).toBeNull();
		});

		it('has a valid status', () => {
			expect(STATUSES).toContain(tool.status);
		});

		it('has a name and description', () => {
			expect(tool.name.trim()).not.toBe('');
			expect(tool.description.trim()).not.toBe('');
		});

		it('links to its folder in the PaperPrototyping repo, or says where the source is', () => {
			if (tool.processingUrl === null) {
				expect(tool.sourceNote?.trim()).toBeTruthy();
			} else {
				expect(tool.processingUrl).toMatch(/^https:\/\/github\.com\/Hannahathome\/PaperPrototyping\/tree\/main\/[A-Za-z]+$/);
			}
		});

		it('has an app when available, none while planned, as a relative path', () => {
			if (tool.status === 'available') expect(tool.appPath).not.toBeNull();
			if (tool.status === 'planned') expect(tool.appPath).toBeNull();
			if (tool.appPath !== null) expect(tool.appPath).toMatch(/^apps\/[a-z0-9-]+\/$/);
		});

		it('points appPath at an existing app page', () => {
			if (tool.appPath !== null) expect(existsSync(`src/pages/${tool.appPath}index.astro`)).toBe(true);
		});

		it('has a tutorials array', () => {
			expect(Array.isArray(tool.tutorials)).toBe(true);
		});
	});
});
