// OpenSCAD export, reproducing FrustumSupport.pde saveOpenSCADFile() line for line. Numbers are
// written exactly as Java prints floats, and the three template files are appended verbatim,
// so the output matches Processing's .scad text (apart from line endings: Processing writes
// the system's, this writes "\n" unless asked otherwise).
import { javaFloatString as f, javaIntString } from '../../../lib/java-format';
import { FLAP_LENGTH, normaliseFrame, type FrameInput } from './params';
import templateFull from './templates/template_full.scad?raw';
import templateHelper from './templates/template_helper.scad?raw';
import templateSimple from './templates/template_simple.scad?raw';

/** Processing's loadStrings(): lines without terminators; a final newline adds no empty line. */
function lines(text: string): string[] {
	const split = text.split(/\r\n|\r|\n/);
	if (split.length > 0 && split[split.length - 1] === '') split.pop();
	return split;
}

function topTrimSlice(tR: string, fh: string, eR: string): string[] {
	return [
		'  // Top trimming slice: cuts all wall struts off straight',
		`  translate([0, 0, ${fh}/2 - ${eR}])`,
		`    scale([${tR} + ${eR}, ${tR} + ${eR}, 1])`,
		`    cylinder(h = ${eR} * 2, r = 1, $fn = 64);`,
	];
}

export function frameScad(raw: FrameInput, { lineEnding = '\n' }: { lineEnding?: string } = {}): string {
	const input = normaliseFrame(raw);
	const nside = javaIntString(input.sides);
	const [bR, tR, fh, eR] = [input.bottomRadius, input.topRadius, input.height, input.edgeRadius].map(f);
	const out: string[] = ['// Exported programmatically from Processing Canvas Workspace', ''];
	out.push(`flap_length = ${f(FLAP_LENGTH)};  // wedge flap length at the top of each wall strut`, '');

	if (input.rigsEnabled) {
		out.push('// --- ASSEMBLY: wall struts sheared flush at the top plane ---', 'difference() {', '  union() {');
		out.push('    // --- FRUSTUM CAGE (drawn once) ---');
		out.push(`    frustumCage(${nside}, ${bR}, ${tR}, ${fh}, ${eR});`, '');
		out.push(`    // --- INTERNAL RIGS (${input.rigs.length}) ---`);
		input.rigs.forEach((rig, i) => {
			const tag = rig.template === 'Custom' ? '' : ` (${rig.template})`;
			out.push(`    // Rig ${i + 1}${tag}`);
			const args = [fh, eR, ...[rig.width, rig.depth, rig.height, rig.offsetX, rig.offsetY, rig.offsetZ, rig.rotation].map(f)];
			out.push(`    rigSupport(${args.join(', ')}, ${input.dualStruts ? 2 : 1}, ${f(input.strutSpacing)});`);
		});
		out.push('  }', ...topTrimSlice(tR, fh, eR), '}', '', ...lines(templateFull));
	} else {
		out.push('// --- ASSEMBLY: wall struts sheared flush at the top plane ---', 'difference() {');
		out.push(`  frustum(${nside}, ${bR}, ${tR}, ${fh}, ${eR});`);
		out.push(...topTrimSlice(tR, fh, eR), '}', '', ...lines(templateSimple));
	}
	out.push('', ...lines(templateHelper));
	return out.map((line) => line + lineEnding).join('');
}
