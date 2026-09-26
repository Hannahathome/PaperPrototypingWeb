// Regenerates the ScaffoldShell reference exports in tests/fixtures/scaffoldshell/.
//
//   node scripts/fixtures/scaffoldshell/generate.mjs
//
// Runs a temporary copy of the ScaffoldShell sketch with FixtureHarness.pde. Each fixture folder
// gets the fold SVG, the print PDF and the frame .scad exactly as Processing wrote them, and the
// case parameters with the source commit. See ../processing.mjs for PAPERPROTOTYPING_DIR and
// PROCESSING_JAVA.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { copySketch, ROOT, runSketch, sourceInfo } from '../processing.mjs';

const HERE = import.meta.dirname;
const FIXTURES = join(ROOT, 'tests/fixtures/scaffoldshell');
const cases = JSON.parse(readFileSync(join(HERE, 'cases.json'), 'utf8'));
const source = sourceInfo('ScaffoldShell');

const { work, sketch } = copySketch('ScaffoldShell', {
	'FixtureHarness.pde': join(HERE, 'FixtureHarness.pde'),
	'fixture_cases.json': join(HERE, 'cases.json'),
});
mkdirSync(join(sketch, 'output'), { recursive: true });
console.log(`Running ScaffoldShell (${source.commit.slice(0, 7)}${source.localChanges ? ', with local changes' : ''}) from ${work}`);
runSketch(sketch, work);

const outputs = readdirSync(join(sketch, 'output'));
let missing = 0;
for (const c of cases) {
	const pick = (test) => outputs.find((f) => f.startsWith(`${c.id}_`) && test(f));
	const found = {
		'fold.svg': pick((f) => f.includes('_fold_') && f.endsWith('.svg')),
		'print.pdf': pick((f) => f.endsWith('.pdf')),
		'frame.scad': pick((f) => f.endsWith('.scad')),
	};
	if (Object.values(found).some((f) => !f)) {
		console.error(`Missing export for ${c.id}: ${JSON.stringify(found)}`);
		missing++;
		continue;
	}
	const dest = join(FIXTURES, c.id);
	rmSync(dest, { recursive: true, force: true });
	mkdirSync(dest, { recursive: true });
	for (const [name, file] of Object.entries(found)) cpSync(join(sketch, 'output', file), join(dest, name));
	writeFileSync(join(dest, 'params.json'), `${JSON.stringify({ ...c, source }, null, '\t')}\n`);
	console.log(`  ${c.id}: ${Object.values(found).join(', ')}`);
}

rmSync(work, { recursive: true, force: true });
if (missing > 0) process.exit(1);
