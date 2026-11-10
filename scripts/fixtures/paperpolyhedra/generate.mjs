// Regenerates the PaperPolyhedra reference exports in tests/fixtures/paperpolyhedra/.
//
//   node scripts/fixtures/paperpolyhedra/generate.mjs
//
// Runs a temporary copy of the PaperPolyhedra sketch with FixtureHarness.pde and copies each
// shape's print PDF and fold SVG into the fixtures folder, together with the parameters and
// the PaperPrototyping commit they came from. See ../processing.mjs for PAPERPROTOTYPING_DIR
// and PROCESSING_JAVA. A window opens briefly while the sketch runs.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { copySketch, ROOT, runSketch, sourceInfo } from '../processing.mjs';

const HERE = import.meta.dirname;
const FIXTURES = join(ROOT, 'tests/fixtures/paperpolyhedra');
const shapes = JSON.parse(readFileSync(join(HERE, 'shapes.json'), 'utf8'));
const source = sourceInfo('PaperPolyhedra');

const { work, sketch } = copySketch('PaperPolyhedra', {
	'FixtureHarness.pde': join(HERE, 'FixtureHarness.pde'),
	'fixture_shapes.json': join(HERE, 'shapes.json'),
});
mkdirSync(join(sketch, 'output'), { recursive: true });
console.log(`Running PaperPolyhedra (${source.commit.slice(0, 7)}${source.localChanges ? ', with local changes' : ''}) from ${work}`);
runSketch(sketch, work);

const outputs = readdirSync(join(sketch, 'output'));
let missing = 0;
for (const shape of shapes) {
	const fold = outputs.find((f) => f.startsWith(`${shape.id}_fold_`) && f.endsWith('.svg'));
	const pdf = outputs.find((f) => f.startsWith(`${shape.id}_`) && f.endsWith('.pdf') && !f.includes('_fold_') && !f.includes('_calib_'));
	if (!fold || !pdf) {
		console.error(`Missing export for ${shape.id}`);
		missing++;
		continue;
	}
	const dest = join(FIXTURES, shape.id);
	rmSync(dest, { recursive: true, force: true });
	mkdirSync(dest, { recursive: true });
	cpSync(join(sketch, 'output', fold), join(dest, 'fold.svg'));
	cpSync(join(sketch, 'output', pdf), join(dest, 'print.pdf'));
	writeFileSync(join(dest, 'params.json'), `${JSON.stringify({ ...shape, source }, null, '\t')}\n`);
	console.log(`  ${shape.id}: ${fold}, ${pdf}`);
}

rmSync(work, { recursive: true, force: true });
if (missing > 0) process.exit(1);
