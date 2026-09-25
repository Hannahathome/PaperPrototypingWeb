// Regenerates the PaperPhicons reference exports in tests/fixtures/paperphicons/.
//
//   node scripts/fixtures/paperphicons/generate.mjs
//
// Runs a temporary copy of the PaperPhicons sketch with FixtureHarness.pde. Each fixture folder
// gets Processing's three files under fixed names (print.pdf, fold.svg, calib.svg) and the case
// parameters with the source commit. See ../processing.mjs for PAPERPROTOTYPING_DIR and
// PROCESSING_JAVA.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { copySketch, ROOT, runSketch, sourceInfo } from '../processing.mjs';

const HERE = import.meta.dirname;
const FIXTURES = join(ROOT, 'tests/fixtures/paperphicons');
const cases = JSON.parse(readFileSync(join(HERE, 'cases.json'), 'utf8'));
const source = sourceInfo('PaperPhicons');

const { work, sketch } = copySketch('PaperPhicons', {
	'FixtureHarness.pde': join(HERE, 'FixtureHarness.pde'),
	'fixture_cases.json': join(HERE, 'cases.json'),
});
mkdirSync(join(sketch, 'output'), { recursive: true });
console.log(`Running PaperPhicons (${source.commit.slice(0, 7)}${source.localChanges ? ', with local changes' : ''}) from ${work}`);
runSketch(sketch, work);

let missing = 0;
for (const c of cases) {
	const dir = join(sketch, 'fixture_out', c.id);
	const files = existsSync(dir) ? readdirSync(dir) : [];
	const pick = (prefix, ext) => files.find((f) => f.startsWith(prefix) && f.endsWith(ext));
	const found = { 'print.pdf': pick('result_', '.pdf'), 'fold.svg': pick('res_f_', '.svg'), 'calib.svg': pick('calib_f_', '.svg') };
	if (Object.values(found).some((f) => !f)) {
		console.error(`Missing export for ${c.id}: ${files.join(', ')}`);
		missing++;
		continue;
	}
	const dest = join(FIXTURES, c.id);
	rmSync(dest, { recursive: true, force: true });
	mkdirSync(dest, { recursive: true });
	for (const [name, file] of Object.entries(found)) cpSync(join(dir, file), join(dest, name));
	writeFileSync(join(dest, 'params.json'), `${JSON.stringify({ ...c, source }, null, '\t')}\n`);
	console.log(`  ${c.id}: ${Object.values(found).join(', ')}`);
}

rmSync(work, { recursive: true, force: true });
if (missing > 0) process.exit(1);
