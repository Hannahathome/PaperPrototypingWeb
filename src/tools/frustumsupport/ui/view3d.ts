// Rotatable 3D preview of the support frame (three.js), drawn from core/frame.ts. Struts are
// cylinders of the edge radius; rig boxes are translucent, the selected one highlighted.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { FrameGeometry, Segment, Vec3 } from '../core/frame';

const COLOURS = {
	frame: '#d8d8d8',
	joint: '#e65a5a',
	spoke: '#82aaff',
	spine: '#f0be6e',
	post: '#c3e88d',
	link: '#f478be',
	box: '#8abeb7',
	selected: '#ffd282',
};

/** OpenSCAD z-up (mm) → three.js y-up. */
const toThree = ([x, y, z]: Vec3) => new THREE.Vector3(x, z, -y);

export class FrameView3D {
	private renderer: THREE.WebGLRenderer;
	private scene = new THREE.Scene();
	private camera = new THREE.PerspectiveCamera(35, 1, 0.5, 5000);
	private controls: OrbitControls;
	private group = new THREE.Group();
	private framed = false;

	constructor(private container: HTMLElement) {
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		container.append(this.renderer.domElement);
		this.scene.add(new THREE.HemisphereLight('#ffffff', '#6d6d6d', 2.2));
		const sun = new THREE.DirectionalLight('#ffffff', 1.5);
		sun.position.set(1, 2, 1.5);
		this.scene.add(sun, this.group);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.addEventListener('change', () => this.render());
		new ResizeObserver(() => this.resize()).observe(container);
		this.resize();
	}

	private clear(): void {
		for (const child of [...this.group.children]) {
			this.group.remove(child);
			if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
				child.geometry.dispose();
				(child.material as THREE.Material).dispose();
			}
		}
	}

	private strut([a, b]: Segment, radius: number, colour: string): void {
		const p = toThree(a);
		const q = toThree(b);
		const length = p.distanceTo(q);
		if (length < 1e-6) return;
		const mesh = new THREE.Mesh(
			new THREE.CylinderGeometry(radius, radius, length, 16),
			new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6 }),
		);
		mesh.position.copy(p).add(q).multiplyScalar(0.5);
		mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize());
		this.group.add(mesh);
	}

	private joint(at: Vec3, radius: number, colour: string): void {
		const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6 }));
		mesh.position.copy(toThree(at));
		this.group.add(mesh);
	}

	update(g: FrameGeometry, selectedRig: number): void {
		this.clear();
		const r = Math.max(g.radius, 0.2);
		for (const s of g.struts) this.strut(s, r, COLOURS.frame);
		for (const v of g.bottom) this.joint(v, r, COLOURS.joint);
		for (const s of g.spokes) this.strut(s, r, COLOURS.spoke);
		g.rigs.forEach((rig, i) => {
			this.strut(rig.spine, r, COLOURS.spine);
			this.strut(rig.baseLink, r, COLOURS.link);
			for (const s of rig.posts) {
				this.strut(s, r, COLOURS.post);
				this.joint(s[0], r, COLOURS.post);
			}
			for (const s of rig.connectors) this.strut(s, r, COLOURS.post);

			const colour = i === selectedRig ? COLOURS.selected : COLOURS.box;
			const [w, d, h] = rig.box.size;
			const geometry = new THREE.BoxGeometry(w, h, d);
			const box = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colour, transparent: true, opacity: 0.25, depthWrite: false }));
			const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: colour }));
			for (const object of [box, edges]) {
				object.position.copy(toThree(rig.box.centre));
				object.rotation.y = (rig.box.rotation * Math.PI) / 180;
				this.group.add(object);
			}
		});

		this.group.position.y = -(g.zBottom + g.zTop) / 2;
		if (!this.framed) {
			const size = Math.max(g.zTop - g.zBottom, ...g.top.map(([x, y]) => Math.hypot(x, y) * 2), ...g.bottom.map(([x, y]) => Math.hypot(x, y) * 2));
			this.frame(size);
		}
		this.render();
	}

	private frame(size: number): void {
		this.framed = true;
		const distance = size * 2.6;
		this.camera.position.set(distance * 0.55, distance * 0.5, distance * 0.7);
		this.controls.target.set(0, 0, 0);
		this.controls.update();
	}

	reset(): void {
		this.framed = false;
	}

	private resize(): void {
		const { clientWidth: w, clientHeight: h } = this.container;
		if (w === 0 || h === 0) return;
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.render();
	}

	// Must not call controls.update(): that fires 'change', which calls render().
	private render(): void {
		this.renderer.render(this.scene, this.camera);
	}
}
