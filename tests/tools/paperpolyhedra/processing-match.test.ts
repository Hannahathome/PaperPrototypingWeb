// Layer 2: the web net must match the Processing cut file within 0.1 mm, segment for segment
// (cut lines and every fold dash). Fixtures: tests/fixtures/paperpolyhedra/<id>/.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { segmentsOf, toCutterPaths } from '../../../src/lib/drawing';
import { buildNet } from '../../../src/tools/paperpolyhedra/core/net';
import type { ShapeInput } from '../../../src/tools/paperpolyhedra/core/params';
import { PROCESSING_MM_V } from '../../helpers/processing';
import { parseSvg, segmentsInMm, unmatchedSegments, withoutDegenerate, type Segment } from '../../helpers/svg';

const DIR = 'tests/fixtures/paperpolyhedra';
const TOLERANCE_MM = 0.1;

const fixtures = readdirSync(DIR, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => {
		const params = JSON.parse(readFileSync(join(DIR, entry.name, 'params.json'), 'utf8')) as ShapeInput & { id: string };
		return { id: params.id, params, svg: readFileSync(join(DIR, entry.name, 'fold.svg'), 'utf8') };
	});

describe('PaperPolyhedra matches the Processing cut file', () => {
	it('has fixtures', () => {
		expect(fixtures.length).toBeGreaterThanOrEqual(8);
	});

	it.each(fixtures)('$id', ({ params, svg }) => {
		const expected = withoutDegenerate(segmentsInMm(parseSvg(svg).segments, PROCESSING_MM_V));
		const actual = withoutDegenerate(toCutterPaths(buildNet(params).sheet.paths).flatMap(segmentsOf) as Segment[]);
		const { missing, extra } = unmatchedSegments(actual, expected, TOLERANCE_MM);
		expect({ missing: missing.length, extra: extra.length, firstMissing: missing[0], firstExtra: extra[0] }).toEqual({
			missing: 0,
			extra: 0,
			firstMissing: undefined,
			firstExtra: undefined,
		});
		expect(actual.length).toBe(expected.length);
	});
});
