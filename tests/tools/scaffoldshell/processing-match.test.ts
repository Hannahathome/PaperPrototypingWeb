// The ScaffoldShell cut file (shell net + rig windows) against Processing's, within 0.1 mm, and
// the window plans against what Processing drew.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { segmentsOf, toCutterPaths, type Path } from '../../../src/lib/drawing';
import { buildNet } from '../../../src/tools/paperpolyhedra/core/net';
import { planWindows, windowPaths } from '../../../src/tools/scaffoldshell/core/windows';
import { PROCESSING_MM_V } from '../../helpers/processing';
import { parseSvg, segmentsInMm, unmatchedSegments, withoutDegenerate, type Segment } from '../../helpers/svg';
import { caseInput, scaffoldCases } from './cases';

const TOLERANCE = 0.1;

describe('ScaffoldShell cut file matches Processing', () => {
	it.each(scaffoldCases.map((x) => [x.c.id, x] as const))('%s', (_, { c, dir }) => {
		const { shape, frame } = caseInput(c);
		const net = buildNet(shape);
		const paths: Path[] = [...windowPaths(net, planWindows(shape, frame)), ...net.sheet.paths];
		const actual = withoutDegenerate(toCutterPaths(paths).flatMap(segmentsOf) as Segment[]);
		const expected = withoutDegenerate(segmentsInMm(parseSvg(readFileSync(join(dir, 'fold.svg'), 'utf8')).segments, PROCESSING_MM_V));
		const { missing, extra } = unmatchedSegments(actual, expected, TOLERANCE);
		expect({ missing: missing.slice(0, 3), extra: extra.slice(0, 3), counts: [actual.length, expected.length] }).toEqual({
			missing: [],
			extra: [],
			counts: [expected.length, expected.length],
		});
	});

	it('the fixtures exercise a top-lid window and a wall window', () => {
		const planned = scaffoldCases.flatMap(({ c }) => {
			const { shape, frame } = caseInput(c);
			return planWindows(shape, frame);
		});
		expect(planned.some((p) => p.onLid && p.reaches)).toBe(true);
		expect(planned.some((p) => !p.onLid && p.reaches)).toBe(true);
	});
});
