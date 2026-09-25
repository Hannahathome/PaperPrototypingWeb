// Regenerates the PaperPolyhedra reference exports in tests/fixtures/paperpolyhedra/.
//
//   node scripts/fixtures/paperpolyhedra/generate.mjs
//
// Copies the PaperPolyhedra sketch from the PaperPrototyping repo into a temporary folder
// (the repo itself is never touched), adds FixtureHarness.pde and shapes.json, runs it with
// processing-java, and copies each shape's print PDF and fold SVG into the fixtures folder
// together with the parameters and the PaperPrototyping commit they came from.
//
// Environment:
//   PAPERPROTOTYPING_DIR  path to the PaperPrototyping checkout (default: ../PaperPrototyping)
//   PROCESSING_JAVA       path to processing-java (default: searched in the usual places)
// A window opens briefly while the sketch runs.
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const FIXTURES = join(ROOT, 'tests/fixtures/paperpolyhedra');
const PP_DIR = resolve(ROOT, process.env.PAPERPROTOTYPING_DIR ?? '../PaperPrototyping');
const SKETCH_SRC = join(PP_DIR, 'PaperPolyhedra');

function findProcessingJava() {
	if (process.env.PROCESSING_JAVA) return process.env.PROCESSING_JAVA;
	const candidates = [
		'C:/Program Files (x86)/processing-4.3-windows-x64/processing-4.3/processing-java.exe',
		'C:/Program Files/Processing/processing-java.exe',
		'/usr/local/bin/processing-java',
		'/Applications/Processing.app/Contents/MacOS/processing-java',
	];
	const found = candidates.find((path) => existsSync(path));
	if (!found) throw new Error('processing-java not found. Set PROCESSING_JAVA to its path.');
	return found;
}

if (!existsSync(join(SKETCH_SRC, 'PaperPolyhedra.pde'))) {
	throw new Error(`PaperPolyhedra sketch not found at ${SKETCH_SRC}. Set PAPERPROTOTYPING_DIR.`);
}

const shapes = JSON.parse(readFileSync(join(HERE, 'shapes.json'), 'utf8'));
const commit = execFileSync('git', ['-C', PP_DIR, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = execFileSync('git', ['-C', PP_DIR, 'status', '--porcelain', '--', 'PaperPolyhedra'], { encoding: 'utf8' }).trim() !== '';

// Copy the sketch; skip earlier exports and editor settings.
const work = mkdtempSync(join(tmpdir(), 'pp-fixtures-'));
const sketch = join(work, 'PaperPolyhedra');
cpSync(SKETCH_SRC, sketch, {
	recursive: true,
	filter: (src) => !/[\\/](output|\.claude)([\\/]|$)/.test(src.slice(SKETCH_SRC.length)),
});
cpSync(join(HERE, 'FixtureHarness.pde'), join(sketch, 'FixtureHarness.pde'));
cpSync(join(HERE, 'shapes.json'), join(sketch, 'fixture_shapes.json'));
mkdirSync(join(sketch, 'output'), { recursive: true });

console.log(`Running PaperPolyhedra (${commit.slice(0, 7)}${dirty ? ', with local changes' : ''}) from ${work}`);
const run = spawnSync(findProcessingJava(), [`--sketch=${sketch}`, `--output=${join(work, 'build')}`, '--force', '--run'], {
	stdio: 'inherit',
	timeout: 10 * 60 * 1000,
});
if (run.status !== 0 && run.status !== null) console.warn(`processing-java exited with status ${run.status}`);

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
	writeFileSync(
		join(dest, 'params.json'),
		`${JSON.stringify({ ...shape, source: { repo: 'Hannahathome/PaperPrototyping', sketch: 'PaperPolyhedra', commit, localChanges: dirty } }, null, '\t')}\n`,
	);
	console.log(`  ${shape.id}: ${fold}, ${pdf}`);
}

rmSync(work, { recursive: true, force: true });
if (missing > 0) process.exit(1);
