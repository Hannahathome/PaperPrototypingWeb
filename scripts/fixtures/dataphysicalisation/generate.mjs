// Regenerates the DataPhysicalisation reference exports in tests/fixtures/dataphysicalisation/.
//
//   node scripts/fixtures/dataphysicalisation/generate.mjs
//
// Runs a temporary copy of the DataPhysicalisation sketch with FixtureHarness.pde, which loads
// the CSV of each case in cases.json, applies its mapping and settings and exports JSON. Each
// fixture folder gets Processing's export.json and the case (with the source commit); the CSVs
// are copied next to them. See ../processing.mjs for PAPERPROTOTYPING_DIR and PROCESSING_JAVA.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { copySketch, ROOT, runSketch, sourceInfo } from '../processing.mjs';

const HERE = import.meta.dirname;
const FIXTURES = join(ROOT, 'tests/fixtures/dataphysicalisation');
const cases = JSON.parse(readFileSync(join(HERE, 'cases.json'), 'utf8'));
const source = sourceInfo('DataPhysicalisation');
const csvs = [...new Set(cases.map((c) => c.csv))];

const { work, sketch } = copySketch('DataPhysicalisation', {
	'FixtureHarness.pde': join(HERE, 'FixtureHarness.pde'),
	'fixture_cases.json': join(HERE, 'cases.json'),
	...Object.fromEntries(csvs.map((f) => [f, join(HERE, f)])),
});
mkdirSync(join(sketch, 'fixture_out'), { recursive: true });
console.log(`Running DataPhysicalisation (${source.commit.slice(0, 7)}${source.localChanges ? ', with local changes' : ''}) from ${work}`);
runSketch(sketch, work);

mkdirSync(FIXTURES, { recursive: true });
for (const f of csvs) cpSync(join(HERE, f), join(FIXTURES, f));
let missing = 0;
for (const c of cases) {
	const out = join(sketch, 'fixture_out', `${c.id}.json`);
	if (!existsSync(out)) {
		console.error(`Missing export for ${c.id}`);
		missing++;
		continue;
	}
	const dest = join(FIXTURES, c.id);
	rmSync(dest, { recursive: true, force: true });
	mkdirSync(dest, { recursive: true });
	cpSync(out, join(dest, 'export.json'));
	writeFileSync(join(dest, 'case.json'), `${JSON.stringify({ ...c, source }, null, '\t')}\n`);
	console.log(`  ${c.id}`);
}

rmSync(work, { recursive: true, force: true });
if (missing > 0) process.exit(1);
