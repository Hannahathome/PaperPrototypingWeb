// Rotatable 3D preview of one folded block with its marker (three.js). Display only.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Point } from '../../../lib/drawing';
import { arucoOriginalBits } from '../core/aruco';
import type { BlockInput } from '../core/block';

const PAPER = '#f4f1ea';
const HOLE = '#2b2b2b';

interface FaceMarker {
	id: number;
	size: number;
	/** Offset of its centre from the face centre (mm, x right, y down). */
	offset: Point;
}

/**
 * A face texture: paper with the marker (and its white margin) at its true size and holes drawn
 * dark. Marker and holes are placed in mm from the face centre, x right and y down as on the sheet.
 */
function faceTexture(faceW: number, faceH: number, marker: FaceMarker | null, holes: Point[][]): THREE.CanvasTexture {
	const scale = 12; // px per mm
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.round(faceW * scale));
	canvas.height = Math.max(1, Math.round(faceH * scale));
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = PAPER;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	if (marker) drawMarker(ctx, canvas, marker, scale);
	ctx.fillStyle = HOLE;
	for (const hole of holes) {
		ctx.beginPath();
		hole.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](canvas.width / 2 + x * scale, canvas.height / 2 + y * scale));
		ctx.closePath();
		ctx.fill();
	}
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

function drawMarker(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, { id, size: markerSize, offset }: FaceMarker, scale: number): void {
	const cell = (markerSize / 7) * scale;
	const left = canvas.width / 2 + offset[0] * scale - 4.5 * cell;
	const top = canvas.height / 2 + offset[1] * scale - 4.5 * cell;
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(left, top, 9 * cell, 9 * cell);
	ctx.fillStyle = '#000000';
	ctx.fillRect(left + cell, top + cell, 7 * cell, 7 * cell);
	ctx.fillStyle = '#ffffff';
	arucoOriginalBits(id).forEach((row, r) =>
		row.forEach((bit, c) => {
			if (bit) ctx.fillRect(left + (2 + c) * cell, top + (2 + r) * cell, cell + 0.5, cell + 0.5);
		}),
	);
}

export class BlockView3D {
	private renderer: THREE.WebGLRenderer;
	private scene = new THREE.Scene();
	private camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
	private controls: OrbitControls;
	private group = new THREE.Group();
	private framed = false;

	constructor(private container: HTMLElement) {
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		container.append(this.renderer.domElement);
		this.scene.add(new THREE.HemisphereLight('#ffffff', '#8a8a8a', 2.2));
		const sun = new THREE.DirectionalLight('#ffffff', 1.4);
		sun.position.set(1, 2, 1.5);
		this.scene.add(sun, this.group);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.addEventListener('change', () => this.render());
		new ResizeObserver(() => this.resize()).observe(container);
		this.resize();
	}

	/** `holes`: outlines cut out of the base face, in mm from its centre. */
	update(input: BlockInput, markerId: number | null, holes: Point[][] = []): void {
		for (const child of [...this.group.children]) {
			this.group.remove(child);
			if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
				child.geometry.dispose();
				const materials = Array.isArray(child.material) ? child.material : [child.material];
				for (const m of materials) {
					(m as THREE.MeshStandardMaterial).map?.dispose();
					m.dispose();
				}
			}
		}
		const { width: W, length: L, height: H } = input;
		// three.js box: x = width, y = height (up), z = length. Face order: +x, −x, +y, −y, +z, −z.
		const geometry = new THREE.BoxGeometry(W, H, L);
		const paper = () => new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.9 });
		const offset = input.markerOffsetY ?? 0;
		const marker = (at: Point): FaceMarker | null => (markerId === null ? null : { id: markerId, size: input.markerSize, offset: at });
		const textured = (w: number, h: number, m: FaceMarker | null, faceHoles: Point[][]) =>
			m || faceHoles.length ? new THREE.MeshStandardMaterial({ map: faceTexture(w, h, m, faceHoles), roughness: 0.9 }) : paper();
		// The side wall is H × L on the sheet, turned a quarter on the box (L across, H up).
		const materials = [
			input.markerOnSide ? textured(L, H, marker([offset, 0]), []) : paper(),
			paper(),
			textured(W, L, input.markerOnSide ? null : marker([0, offset]), holes),
			paper(),
			paper(),
			paper(),
		];
		this.group.add(new THREE.Mesh(geometry, materials));
		this.group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: '#3a3a3a' })));
		if (!this.framed) {
			this.framed = true;
			const d = Math.max(W, L, H) * 3.2;
			this.camera.position.set(d * 0.6, d * 0.55, d * 0.7);
			this.controls.target.set(0, 0, 0);
			this.controls.update();
		}
		this.render();
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
