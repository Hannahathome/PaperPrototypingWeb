// OpenSCAD export of the scaffold, reproducing ScaffoldShell's FrameSCAD.pde writeFrameSCAD()
// line for line. Numbers use scadNum() = String.format(Locale.US, "%.4f", float), ported in
// src/lib/java-format.ts; the module libraries are appended verbatim.
import { javaFormatFixed } from '../../../lib/java-format';
import type { ShapeInput } from '../../paperpolyhedra/core/params';
import { frameDims, frameScadParams, type FrameSettings } from './frame';
import templateFrame from './templates/template_frame.scad?raw';
import templateHelper from './templates/template_helper.scad?raw';

const num = (v: number) => javaFormatFixed(v, 4);
const f = Math.fround;

/** Processing's loadStrings(): lines without terminators; a final newline adds no empty line. */
function lines(text: string): string[] {
	const split = text.split(/\r\n|\r|\n/);
	if (split.length > 0 && split[split.length - 1] === '') split.pop();
	return split;
}

/** A filename-safe name for a shape (frameShapeSlug): its label, else "shape<n>". */
export function frameShapeSlug(label: string, index: number): string {
	const name = label
		.trim()
		.replace(/[^A-Za-z0-9_-]+/g, '_')
		.replace(/^_+|_+$/g, '');
	return name === '' ? `shape${index + 1}` : name;
}

/** The .scad for one shape's scaffold, or null when the frame is geometrically impossible. */
export function scaffoldScad(shape: ShapeInput, s: FrameSettings, { lineEnding = '\n' }: { lineEnding?: string } = {}): string | null {
	const p = frameScadParams(shape, s);
	if (!p.valid) return null;
	const d = frameDims(shape);
	const hasRigs = s.rigs.length > 0;
	const out: string[] = [
		'// Internal support scaffold, exported from ScaffoldShell.',
		'// Render with F6, export STL, print. Dimensions are millimetres.',
		'//',
		`// Shell it goes inside: ${d.n} sides, bottom perimeter ${num(d.bottomPerimeter)} mm, top perimeter ${num(d.topPerimeter)} mm, height ${num(d.height)} mm.`,
		`// Derived circumradii: bottom ${num(d.botR)}, top ${num(d.topR)}.`,
		`// Clearance of ${num(s.clearance)} mm is already subtracted from the radii and the height below.`,
		`// Ring phase ${num(d.phaseDeg)} deg aligns the wall struts with the shell's folded corners.`,
		'',
		`flap_length = ${num(s.flapLength)};  // wedge flap length at the top of each wall strut`,
		'',
		'// --- ASSEMBLY: wall struts sheared flush at the top plane ---',
		'difference() {',
		'  union() {',
		`    frustumCage(${p.n}, ${num(p.botR)}, ${num(p.topR)}, ${num(p.height)}, ${num(p.strutRadius)}, ${num(p.phaseDeg)}, ${hasRigs ? 'true' : 'false'});`,
	];
	if (hasRigs) {
		out.push('', `    // --- INTERNAL RIGS (${s.rigs.length}) ---`);
		s.rigs.forEach((r, i) => {
			out.push(`    // Rig ${i + 1}${r.preset === 'Custom' ? '' : `  (${r.preset})`}`);
			const args = [p.height, p.strutRadius, r.width, r.depth, r.height, r.offsetX, r.offsetY, r.offsetZ, r.rotation].map(num);
			out.push(`    rigSupport(${args.join(', ')}, ${s.dualStruts ? '2' : '1'}, ${num(s.strutSpacing)});`);
		});
	}
	out.push(
		'  }',
		'  // Top trimming slice: cuts all wall struts off straight',
		`  translate([0, 0, ${num(f(f(p.height / 2) - p.strutRadius))}])`,
		`    cylinder(h = ${num(f(p.strutRadius * 2))}, r = ${num(f(p.topR + p.strutRadius))}, $fn = 64);`,
		'}',
		'',
		...lines(templateFrame),
		'',
		...lines(templateHelper),
	);
	return out.map((line) => line + lineEnding).join('');
}
