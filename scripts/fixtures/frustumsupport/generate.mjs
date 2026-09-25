// Regenerates the FrustumSupport reference exports in tests/fixtures/frustumsupport/.
//
//   node scripts/fixtures/frustumsupport/generate.mjs
//
// Runs a temporary copy of the FrustumSupport sketch with FixtureHarness.pde, which writes
// one .scad per case in cases.json. Each fixture folder gets the .scad exactly as Processing
// wrote it (Windows line endings included) and the case parameters with the source commit.
// See ../processing.mjs for PAPERPROTOTYPING_DIR and PROCESSING_JAVA.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { copySketch, ROOT, runSketch, sourceInfo } from '../processing.mjs';

const HERE = import.meta.dirname;
const FIXTURES = join(ROOT, 'tests/fixtures/frustumsupport');
const cases = JSON.parse(readFileSync(join(HERE, 'cases.json'), 'utf8'));
const source = sourceInfo('FrustumSupport');

const { work, sketch } = copySketch('FrustumSupport', {
	'FixtureHarness.pde': join(HERE, 'FixtureHarness.pde'),
	'fixture_cases.json': join(HERE, 'cases.json'),
});
console.log(`Running FrustumSupport (${source.commit.slice(0, 7)}${source.localChanges ? ', with local changes' : ''}) from ${work}`);
runSketch(sketch, work);

let missing = 0;
for (const c of cases) {
	const scad = join(sketch, 'fixture_out', `${c.id}.scad`);
	if (!existsSync(scad)) {
		console.error(`Missing export for ${c.id}`);
		missing++;
		continue;
	}
	const dest = join(FIXTURES, c.id);
	rmSync(dest, { recursive: true, force: true });
	mkdirSync(dest, { recursive: true });
	cpSync(scad, join(dest, 'model.scad'));
	writeFileSync(join(dest, 'params.json'), `${JSON.stringify({ ...c, source }, null, '\t')}\n`);
	console.log(`  ${c.id}`);
}

rmSync(work, { recursive: true, force: true });
if (missing > 0) process.exit(1);
