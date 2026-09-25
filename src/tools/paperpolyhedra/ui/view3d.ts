// Rotatable 3D preview of the folded shape (three.js). Display only: geometry comes from
// core/solid.ts, image placement mirrors core/artwork.ts so the preview shows what prints.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { TextureSource } from '../../../lib/raster';
import { STRIP_DENSITY, TESSELLATION_DENSITY, type SideMode } from '../core/artwork';
import type { ShapeDims } from '../core/params';
import { foldedSolid, type Vec3 } from '../core/solid';

export interface Look {
	fill: string | null;
	sideMode: SideMode;
	strip: TextureSource | null;
	panels: (TextureSource | null)[];
	topLid: TextureSource | null;
	bottomLid: TextureSource | null;
}

const PAPER = '#f4f1ea';

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Builds a triangle mesh from positions (mm, z up) and our UVs (v down), converted to three's (y up, v up). */
function meshGeometry(positions: Vec3[], uvs: [number, number][]): THREE.BufferGeometry {
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions.flatMap(([x, y, z]) => [x, z, -y]), 3));
	geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs.flatMap(([u, v]) => [u, 1 - v]), 2));
	geometry.computeVertexNormals();
	return geometry;
}

export class ShapeView3D {
	private renderer: THREE.WebGLRenderer;
	private scene = new THREE.Scene();
	private camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
	private controls: OrbitControls;
	private group = new THREE.Group();
	private textures = new Map<TextureSource, THREE.Texture>();
	private resizeObserver: ResizeObserver;
	private framed = false;

	constructor(private container: HTMLElement) {
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		container.append(this.renderer.domElement);
		this.scene.add(new THREE.HemisphereLight('#ffffff', '#8a8a8a', 2.2));
		const sun = new THREE.DirectionalLight('#ffffff', 1.6);
		sun.position.set(1, 2, 1.5);
		this.scene.add(sun, this.group);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.addEventListener('change', () => this.render());
		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(container);
		this.resize();
	}

	private texture(source: TextureSource): THREE.Texture {
		let texture = this.textures.get(source);
		if (!texture) {
			texture = new THREE.Texture(source as HTMLImageElement);
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.needsUpdate = true;
			this.textures.set(source, texture);
		}
		return texture;
	}

	private material(fill: string | null, image: TextureSource | null): THREE.Material {
		if (fill) return new THREE.MeshStandardMaterial({ color: fill, roughness: 0.9, side: THREE.DoubleSide });
		return new THREE.MeshStandardMaterial({
			color: '#ffffff',
			map: image ? this.texture(image) : null,
			roughness: 0.9,
			side: THREE.DoubleSide,
			...(image ? {} : { color: PAPER }),
		});
	}

	update(dims: ShapeDims, look: Look): void {
		for (const child of [...this.group.children]) {
			this.group.remove(child);
			if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
				child.geometry.dispose();
				(child.material as THREE.Material).dispose();
			}
		}
		const solid = foldedSolid(dims);
		const n = dims.sides;

		// Net panel k ↔ face (n − k) mod n, so panel 0 faces the viewer and the strip runs the way
		// it folds with the printed side out. Corner map: net bottom-left = bottom[i+1].
		for (let k = 0; k < n; k++) {
			const i = (n - k) % n;
			const j = (i + 1) % n;
			const corners = { bl: solid.bottom[j], br: solid.bottom[i], tr: solid.top[i], tl: solid.top[j] };
			const at = (u: number, v: number) => lerp3(lerp3(corners.bl, corners.br, u), lerp3(corners.tl, corners.tr, u), v);
			const positions: Vec3[] = [];
			const uvs: [number, number][] = [];
			let image: TextureSource | null = null;
			if (look.sideMode === 'strip') {
				image = look.strip;
				const d = STRIP_DENSITY;
				for (let row = 0; row < d; row++) {
					for (let col = 0; col < d; col++) {
						const [a0, a1, b0, b1] = [col / d, (col + 1) / d, row / d, (row + 1) / d];
						const uv = (a: number, b: number): [number, number] => [(k + a) / n, b];
						positions.push(at(a0, b0), at(a1, b0), at(a0, b1), at(a1, b0), at(a1, b1), at(a0, b1));
						uvs.push(uv(a0, b0), uv(a1, b0), uv(a0, b1), uv(a1, b0), uv(a1, b1), uv(a0, b1));
					}
				}
			} else {
				image = look.sideMode === 'perPanel' ? (look.panels[k] ?? null) : null;
				// Same diagonal as the print: (tl, tr, bl) and (tr, br, bl).
				positions.push(corners.tl, corners.tr, corners.bl, corners.tr, corners.br, corners.bl);
				uvs.push([0, 1], [1, 1], [0, 0], [1, 1], [1, 0], [0, 0]);
			}
			this.group.add(new THREE.Mesh(meshGeometry(positions, uvs), this.material(look.fill, image)));
		}

		// Lids: the image disc as printed, seen from outside (top from above, bottom from below).
		const lid = (ring: Vec3[], image: TextureSource | null, top: boolean) => {
			const centre: Vec3 = [0, 0, ring[0][2]];
			const radius = Math.hypot(ring[0][0], ring[0][1]);
			const aspect = image ? (('naturalWidth' in image ? image.naturalWidth : image.width) || 1) / (('naturalHeight' in image ? image.naturalHeight : image.height) || 1) : 1;
			const su = Math.min(1, 1 / aspect) / 2;
			const sv = Math.min(1, aspect) / 2;
			const positions: Vec3[] = [];
			const uvs: [number, number][] = [];
			const d = TESSELLATION_DENSITY;
			for (let s = 0; s < n; s++) {
				const a = ring[s];
				const b = ring[(s + 1) % n];
				for (let step = 0; step < d; step++) {
					const p = lerp3(a, b, step / d);
					const q = lerp3(a, b, (step + 1) / d);
					const uv = ([x, y]: Vec3): [number, number] => [0.5 + (x / radius) * su, 0.5 + ((top ? -y : y) / radius) * sv];
					if (top) positions.push(centre, p, q);
					else positions.push(centre, q, p);
					uvs.push(uv(centre), ...(top ? [uv(p), uv(q)] : [uv(q), uv(p)]));
				}
			}
			this.group.add(new THREE.Mesh(meshGeometry(positions, uvs), this.material(look.fill, look.sideMode === 'none' ? null : image)));
		};
		lid(solid.bottom, look.bottomLid, false);
		lid(solid.top, look.topLid, true);

		// Fold edges.
		const edges: Vec3[] = [];
		for (let i = 0; i < n; i++) {
			const j = (i + 1) % n;
			edges.push(solid.bottom[i], solid.bottom[j], solid.top[i], solid.top[j], solid.bottom[i], solid.top[i]);
		}
		const edgeGeometry = new THREE.BufferGeometry();
		edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edges.flatMap(([x, y, z]) => [x, z, -y]), 3));
		this.group.add(new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({ color: '#3a3a3a' })));

		this.group.position.y = -solid.height / 2;
		if (!this.framed) this.frame(Math.max(solid.height, ...solid.bottom.map((p) => Math.hypot(p[0], p[1]) * 2)));
		this.render();
	}

	private frame(size: number): void {
		this.framed = true;
		const distance = size * 3.4;
		this.camera.position.set(distance * 0.55, distance * 0.45, distance * 0.7);
		this.controls.target.set(0, 0, 0);
		this.controls.update();
	}

	/** Re-fit the camera to the current shape. */
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

	/** Forget cached textures for images that are no longer used. */
	forget(source: TextureSource): void {
		this.textures.get(source)?.dispose();
		this.textures.delete(source);
	}
}
