// ScaffoldShell fixture cases (tests/fixtures/scaffoldshell), shared by the ScaffoldShell tests.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ShapeInput } from '../../../src/tools/paperpolyhedra/core/params';
import type { FrameSettings, Rig } from '../../../src/tools/scaffoldshell/core/frame';

const DIR = 'tests/fixtures/scaffoldshell';

export interface ScaffoldCase {
	id: string;
	sides: number;
	topDiameter: number;
	bottomDiameter: number;
	height: number;
	tabDepth: number;
	flapDepth: number;
	flapTaper: number;
	frame: { strutRadius: number; clearance: number; dualStruts: boolean; strutSpacing: number; flapLength: number; rigs: (Omit<Rig, 'cutoutFace' | 'cutoutSize'> & { cutoutFace: number; cutoutSize: number })[] };
}

export const scaffoldCases = readdirSync(DIR, { withFileTypes: true })
	.filter((e) => e.isDirectory())
	.map((e) => ({
		c: JSON.parse(readFileSync(join(DIR, e.name, 'params.json'), 'utf8')) as ScaffoldCase,
		dir: join(DIR, e.name),
	}));

export function caseInput(c: ScaffoldCase): { shape: ShapeInput; frame: FrameSettings } {
	return {
		shape: { sides: c.sides, topDiameter: c.topDiameter, bottomDiameter: c.bottomDiameter, height: c.height, tabDepth: c.tabDepth, flapDepth: c.flapDepth, flapTaper: c.flapTaper },
		frame: { enabled: true, ...c.frame, rigs: c.frame.rigs.map((r) => ({ ...r, cutoutFace: r.cutoutFace as Rig['cutoutFace'], cutoutSize: r.cutoutSize as Rig['cutoutSize'] })) },
	};
}
