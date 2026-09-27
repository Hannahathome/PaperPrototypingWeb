// Regenerates the Phicon Widgets reference exports in tests/fixtures/phiconwidgets/.
//
//   node scripts/fixtures/phiconwidgets/generate.mjs
//
// Runs a temporary copy of the TEI27 sketch PaperPhicons_Boilerplate_v1_1_Cutout with
// FixtureHarness.pde. Each fixture folder gets Processing's three files under fixed names
// (print.pdf, fold.svg, calib.svg) and the case parameters with a hash of the sketch's .pde files
// (the folder has no commits). See ../processing.mjs for TEI27_DIR and PROCESSING_JAVA.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { copySketch, ROOT, runSketch, TEI27_DIR, tei27SourceInfo } from '../processing.mjs';

const HERE = import.meta.dirname;
const FIXTURES = join(ROOT, 'tests/fixtures/phiconwidgets');
const cases = JSON.parse(readFileSync(join(HERE, 'cases.json'), 'utf8'));
const SKETCH = 'PaperPhicons_Boilerplate_v1_1_Cutout';
const source = tei27SourceInfo(SKETCH);

const { work, sketch } = copySketch(SKETCH, {
	'FixtureHarness.pde': join(HERE, 'FixtureHarness.pde'),
	'fixture_cases.json': join(HERE, 'cases.json'),
}, { from: TEI27_DIR });
mkdirSync(join(sketch, 'output'), { recursive: true });
console.log(`Running ${SKETCH} (.pde sha256 ${source.pdeSha256.slice(0, 12)}) from ${work}`);
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
