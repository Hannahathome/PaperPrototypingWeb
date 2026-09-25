// Shared helpers for generating Processing reference exports. Each tool's generate.mjs copies
// its sketch from the PaperPrototyping repo into a temporary folder (the repo itself is never
// touched), adds a harness tab and its cases, and runs it with processing-java.
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '../..');

/** PaperPrototyping checkout (PAPERPROTOTYPING_DIR, default ../PaperPrototyping). */
export const PP_DIR = resolve(ROOT, process.env.PAPERPROTOTYPING_DIR ?? '../PaperPrototyping');

export function findProcessingJava() {
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

/** The commit of the sketch folder, and whether it has uncommitted changes. */
export function sourceInfo(sketchName) {
	const commit = execFileSync('git', ['-C', PP_DIR, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
	const localChanges = execFileSync('git', ['-C', PP_DIR, 'status', '--porcelain', '--', sketchName], { encoding: 'utf8' }).trim() !== '';
	return { repo: 'Hannahathome/PaperPrototyping', sketch: sketchName, commit, localChanges };
}

/**
 * Copy `sketchName` to a temporary folder with extra files added ({ destName: sourcePath }),
 * skipping earlier exports, and return the folder of the copied sketch.
 */
export function copySketch(sketchName, extraFiles) {
	const source = join(PP_DIR, sketchName);
	if (!existsSync(join(source, `${sketchName}.pde`))) {
		throw new Error(`${sketchName} sketch not found at ${source}. Set PAPERPROTOTYPING_DIR.`);
	}
	const work = mkdtempSync(join(tmpdir(), `${sketchName.toLowerCase()}-fixtures-`));
	const sketch = join(work, sketchName);
	cpSync(source, sketch, {
		recursive: true,
		filter: (src) => !/[\\/](output|\.claude)([\\/]|$)/.test(src.slice(source.length)) && !/\.(scad|stl)$/i.test(src),
	});
	for (const [dest, src] of Object.entries(extraFiles)) cpSync(src, join(sketch, dest));
	return { work, sketch };
}

/** Run a sketch with processing-java; a window opens briefly. */
export function runSketch(sketch, work) {
	const run = spawnSync(findProcessingJava(), [`--sketch=${sketch}`, `--output=${join(work, 'build')}`, '--force', '--run'], {
		stdio: 'inherit',
		timeout: 10 * 60 * 1000,
	});
	if (run.status !== 0 && run.status !== null) console.warn(`processing-java exited with status ${run.status}`);
}
