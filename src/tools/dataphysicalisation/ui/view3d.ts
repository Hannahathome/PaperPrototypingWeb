// 3D view of the mapped shapes (three.js): prisms or boxes on a grid, as DataPhysicalisation
// lays them out (gridPos: 120 mm slots, 20 mm gaps), with labels. Display only.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import type { Mode, Shape } from '../core/mapping';

const SLOT = 120;
const GAP = 20;

/** Centre (x, z) of shape i of n in a square grid (gridPos). */
export function gridPosition(i: number, n: number): [number, number] {
	const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
	const rows = Math.max(1, Math.ceil(n / cols));
	const sp = SLOT + GAP;
	const sx = -(cols * sp - GAP) / 2 + SLOT / 2;
	const sz = -(rows * sp - GAP) / 2 + SLOT / 2;
	return [sx + (i % cols) * sp, sz + Math.floor(i / cols) * sp];
}

export class ShapesView3D {
	private renderer: THREE.WebGLRenderer;
	private labels = new CSS2DRenderer();
	private scene = new THREE.Scene();
	private camera = new THREE.PerspectiveCamera(35, 1, 1, 20000);
	private controls: OrbitControls;
	private group = new THREE.Group();
	/** Camera distance for the preset views, set from the layout size. */
	private distance = 800;
	private targetY = 50;
	private framedCount = -1;

	constructor(private container: HTMLElement) {
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		container.append(this.renderer.domElement);
		Object.assign(this.labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
		container.append(this.labels.domElement);
		this.scene.add(new THREE.HemisphereLight('#ffffff', '#6d6d6d', 2.2));
		const sun = new THREE.DirectionalLight('#ffffff', 1.4);
		sun.position.set(1, 2, 1.5);
		this.scene.add(sun, this.group);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.addEventListener('change', () => this.render());
		new ResizeObserver(() => this.resize()).observe(container);
		this.view('iso');
		this.resize();
	}

	update(shapes: Shape[], mode: Mode): void {
		for (const child of [...this.group.children]) {
			child.traverse((o) => {
				if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
					o.geometry.dispose();
					(o.material as THREE.Material).dispose();
				}
				if (o instanceof CSS2DObject) o.element.remove();
			});
			this.group.remove(child);
		}
		const n = shapes.length;
		const extent = Math.ceil(Math.sqrt(Math.max(n, 1))) * (SLOT + GAP);
		const grid = new THREE.GridHelper(extent + 200, Math.max(4, Math.round((extent + 200) / 50)), '#5a5f6a', '#3c4049');
		this.group.add(grid);

		shapes.forEach((shape, i) => {
			const [x, z] = gridPosition(i, n);
			const geometry =
				mode === 'polyhedra'
					? new THREE.CylinderGeometry(shape.diameter / 2, shape.diameter / 2, shape.height, shape.sides)
					: new THREE.BoxGeometry(shape.width, shape.height, shape.depth);
			const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: shape.colour, roughness: 0.7 }));
			mesh.position.set(x, shape.height / 2, z);
			const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: '#c8c8c8', transparent: true, opacity: 0.3 }));
			edges.position.copy(mesh.position);
			const label = document.createElement('span');
			label.textContent = shape.label;
			Object.assign(label.style, { color: '#e6e6e6', font: '12px system-ui, sans-serif', textShadow: '0 1px 2px #000' });
			const tag = new CSS2DObject(label);
			tag.position.set(x, shape.height + 8, z);
			this.group.add(mesh, edges, tag);
		});
		// Re-frame when the number of shapes changes (e.g. a new file), not on every edit.
		const tallest = Math.max(10, ...shapes.map((s) => (Number.isFinite(s.height) ? s.height : 0)));
		if (n !== this.framedCount) {
			this.framedCount = n;
			this.distance = Math.max(250, extent * 1.3, tallest * 3);
			this.targetY = tallest / 2;
			this.view('iso');
		}
		this.render();
	}

	/** Preset camera views (snapFront, snapTop, snapSide, snapIso). */
	view(which: 'front' | 'top' | 'side' | 'iso'): void {
		const d = this.distance;
		const positions: Record<typeof which, [number, number, number]> = {
			front: [0, 60, d],
			top: [0, d, 0.01],
			side: [d, 60, 0],
			iso: [d * 0.55, d * 0.5, d * 0.65],
		};
		this.camera.position.set(...positions[which]);
		this.controls.target.set(0, this.targetY, 0);
		this.controls.update();
	}

	private resize(): void {
		const { clientWidth: w, clientHeight: h } = this.container;
		if (w === 0 || h === 0) return;
		this.renderer.setSize(w, h, false);
		this.labels.setSize(w, h);
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.render();
	}

	// Must not call controls.update(): that fires 'change', which calls render().
	private render(): void {
		this.renderer.render(this.scene, this.camera);
		this.labels.render(this.scene, this.camera);
	}
}
