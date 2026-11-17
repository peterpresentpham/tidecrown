// Dev gallery for the voxel scenery (src/render/voxelScenery.ts): every model on a grid, arm pivots in red.
// ?filter=knight limits the grid; ?team=%23eb4646 changes the faction tint.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { voxelScenery } from '../../src/render/voxelScenery';

const params = new URLSearchParams(location.search);
const filter = params.get('filter') ?? '';
const team = params.get('team') ?? '#2477f3';
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1d2a30');
scene.add(new THREE.HemisphereLight('#fff8de', '#5a7f84', 2.2));
const sun = new THREE.DirectionalLight('#fff1cd', 2.4);
sun.position.set(-6, 12, 8);
scene.add(sun);
const library = voxelScenery();
const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.85,
});
const list = library.names().filter((n) => n.includes(filter));
const columns = Math.ceil(Math.sqrt(list.length * 1.6));
const labels: { el: HTMLSpanElement; p: THREE.Vector3 }[] = [];
list.forEach((name, i) => {
  const x = (i % columns) * 2.4,
    z = Math.floor(i / columns) * 2.6;
  const mesh = new THREE.Mesh(library.geometry(name, team), material);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const tile = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.04, 1.9),
    new THREE.MeshStandardMaterial({ color: '#71984e' })
  );
  tile.position.set(x, -0.02, z);
  scene.add(tile);
  for (const suffix of ['arm']) {
    const a = library.anchor(`${name}.${suffix}`);
    if (a.lengthSq() === 0) continue;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.035),
      new THREE.MeshBasicMaterial({ color: 'red' })
    );
    dot.position.copy(a).add(mesh.position);
    scene.add(dot);
  }
  const el = document.createElement('span');
  el.textContent = name;
  document.getElementById('labels')!.append(el);
  labels.push({ el, p: new THREE.Vector3(x, 0, z + 0.95) });
});
const rows = Math.ceil(list.length / columns);
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 400);
const center = new THREE.Vector3(((columns - 1) * 2.4) / 2, 0, ((rows - 1) * 2.6) / 2);
const span = Math.max(columns * 2.4, rows * 2.6);
camera.position.copy(center).add(new THREE.Vector3(span * 0.45, span * 0.95, span * 1.05));
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(center);
controls.update();
(function frame() {
  controls.update();
  renderer.render(scene, camera);
  for (const l of labels) {
    const v = l.p.clone().project(camera);
    l.el.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`;
    l.el.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
  }
  requestAnimationFrame(frame);
})();
