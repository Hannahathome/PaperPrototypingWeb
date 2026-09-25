import { describe, expect, it } from 'vitest';
import { CATEGORIES, STATUSES, tools } from '../../src/data/tools';

describe('tools.json', () => {
	it('has at least one tool', () => {
		expect(tools.length).toBeGreaterThan(0);
	});

	it('has unique, lowercase, URL-safe ids', () => {
		const ids = tools.map((tool) => tool.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
	});

	describe.each(tools)('$id', (tool) => {
		it('has a valid category', () => {
			expect(CATEGORIES).toContain(tool.category);
		});

		it('has a valid status', () => {
			expect(STATUSES).toContain(tool.status);
		});

		it('has a name and description', () => {
			expect(tool.name.trim()).not.toBe('');
			expect(tool.description.trim()).not.toBe('');
		});

		it('links to its folder in the PaperPrototyping repo', () => {
			expect(tool.processingUrl).toMatch(
				/^https:\/\/github\.com\/Hannahathome\/PaperPrototyping\/tree\/main\/[A-Za-z]+$/,
			);
		});

		it('has an appPath only when available, as a relative path', () => {
			if (tool.status === 'available') {
				expect(tool.appPath).toMatch(/^apps\/[a-z0-9-]+\/$/);
			} else {
				expect(tool.appPath).toBeNull();
			}
		});

		it('has a tutorials array', () => {
			expect(Array.isArray(tool.tutorials)).toBe(true);
		});
	});
});
