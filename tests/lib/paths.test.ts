import { describe, expect, it } from 'vitest';
import { withBase } from '../../src/lib/paths';

describe('withBase', () => {
	it('prefixes the deploy base, with or without trailing slash on the base', () => {
		expect(withBase('tools/paperpolyhedra/', '/PaperPrototypingWeb/')).toBe('/PaperPrototypingWeb/tools/paperpolyhedra/');
		expect(withBase('tools/paperpolyhedra/', '/PaperPrototypingWeb')).toBe('/PaperPrototypingWeb/tools/paperpolyhedra/');
	});

	it('does not double the slash when the path starts with one', () => {
		expect(withBase('/tools/x/', '/PaperPrototypingWeb/')).toBe('/PaperPrototypingWeb/tools/x/');
	});

	it('keeps fragments', () => {
		expect(withBase('tools/x/#tutorials', '/PaperPrototypingWeb')).toBe('/PaperPrototypingWeb/tools/x/#tutorials');
	});

	it('works with a root base', () => {
		expect(withBase('tools/x/', '/')).toBe('/tools/x/');
	});
});
