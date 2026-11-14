/**
 * Turns a loaded model into flat, vertex-coloured triangles in the game's coordinate frame.
 *
 * The game renders every model with one vertex-colour material (fog-of-war shader, batching,
 * memory shading), so textures are sampled per vertex here. Vertices whose colour matches the
 * entry's team mask keep only a brightness factor; the game tints them with the faction colour.
 */
import * as THREE from 'three';

import type { Image, Loaded } from './load';

export type TeamMask = {
  /** Material names whose surfaces always take the faction colour. */
  materials?: string[];
  /** Hue range in degrees (wraps when min > max) plus a minimum saturation. */
  hue?: [number, number];
  saturation?: number;
};

export type Triangles = {
  positions: number[];
  /** sRGB bytes; for masked vertices rgb is a brightness factor (128 = faction colour as is). */
  colors: number[];
};

const position = new THREE.Vector3();
const uv = new THREE.Vector2();
const color = new THREE.Color();

function sample(image: Image, u: number, v: number, out: THREE.Color) {
  // glTF UVs: origin top-left. Repeat wrapping, nearest texel (textures are palette swatches).
  const x = Math.min(image.width - 1, Math.max(0, Math.floor((u - Math.floor(u)) * image.width)));
  const y = Math.min(image.height - 1, Math.max(0, Math.floor((v - Math.floor(v)) * image.height)));
  const i = (y * image.width + x) * 4;
  out.setRGB(image.data[i] / 255, image.data[i + 1] / 255, image.data[i + 2] / 255);
}

function inMask(mask: TeamMask | undefined, material: string, c: THREE.Color) {
  if (!mask) return false;
  if (mask.materials?.includes(material)) return true;
  if (!mask.hue) return false;
  const hsl = { h: 0, s: 0, l: 0 };
  // Colour values here are sRGB bytes / 255; getHSL would treat them as linear.
  c.getHSL(hsl, THREE.LinearSRGBColorSpace);
  const h = hsl.h * 360,
    [min, max] = mask.hue;
  const hueOk = min <= max ? h >= min && h <= max : h >= min || h <= max;
  return hueOk && hsl.s >= (mask.saturation ?? 0.45) && hsl.l > 0.12 && hsl.l < 0.85;
}

/** Applies an animation pose (clip at time) so skinned meshes can be baked in that pose. */
export function pose(model: Loaded, clipName: string | undefined, time = 0) {
  model.scene.updateMatrixWorld(true);
  if (!clipName) return;
  const clip = model.animations.find((a) => a.name === clipName);
  if (!clip) throw new Error(`Missing animation ${clipName}`);
  const mixer = new THREE.AnimationMixer(model.scene);
  mixer.clipAction(clip).play();
  mixer.setTime(Math.min(time, clip.duration));
  model.scene.updateMatrixWorld(true);
}

/** Collects the meshes whose own name (or any ancestor's name) matches the filter. */
export function meshes(model: Loaded, include?: RegExp, exclude?: RegExp) {
  const found: THREE.Mesh[] = [];
  model.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (include && !include.test(mesh.name)) return;
    if (exclude && exclude.test(mesh.name)) return;
    found.push(mesh);
  });
  return found;
}

/** World-space triangles of the given meshes, coloured from textures or material colours. */
export function triangles(model: Loaded, list: THREE.Mesh[], mask?: TeamMask): Triangles {
  const out: Triangles = { positions: [], colors: [] };
  for (const mesh of list) {
    const geometry = mesh.geometry;
    const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as (
      THREE.MeshStandardMaterial | THREE.MeshPhongMaterial
    )[];
    const pos = geometry.getAttribute('position');
    const uvs = geometry.getAttribute('uv');
    const vertexColors = geometry.getAttribute('color');
    const index = geometry.index;
    const count = index ? index.count : pos.count;
    const groups = geometry.groups.length
      ? geometry.groups
      : [{ start: 0, count, materialIndex: 0 }];
    const skinned = (mesh as THREE.SkinnedMesh).isSkinnedMesh;
    for (const group of groups) {
      const material = materials[group.materialIndex ?? 0] ?? materials[0];
      const texture = model.textures.get(material.name);
      for (let k = group.start; k < Math.min(group.start + group.count, count); k++) {
        const i = index ? index.getX(k) : k;
        if (skinned) (mesh as THREE.SkinnedMesh).getVertexPosition(i, position);
        else position.fromBufferAttribute(pos, i);
        position.applyMatrix4(mesh.matrixWorld);
        out.positions.push(position.x, position.y, position.z);
        if (texture && uvs) {
          uv.fromBufferAttribute(uvs as THREE.BufferAttribute, i);
          sample(texture, uv.x, uv.y, color);
        } else color.setRGB(1, 1, 1);
        // Material colours are linear in three; convert back to sRGB bytes.
        const tint = material.color.clone().convertLinearToSRGB();
        color.multiply(tint);
        if (vertexColors)
          color.multiply(
            new THREE.Color(vertexColors.getX(i), vertexColors.getY(i), vertexColors.getZ(i))
          );
        if (inMask(mask, material.name, color)) {
          // Brightness relative to a mid-tone keeps the swatch's shading after tinting.
          const lum = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
          const factor = Math.round(Math.min(255, Math.max(40, (lum / 0.42) * 128)));
          out.colors.push(factor, factor, factor, 255);
        } else
          out.colors.push(
            Math.round(Math.min(1, color.r) * 255),
            Math.round(Math.min(1, color.g) * 255),
            Math.round(Math.min(1, color.b) * 255),
            0
          );
      }
    }
  }
  return out;
}

export function bounds(t: Triangles) {
  const box = new THREE.Box3();
  for (let i = 0; i < t.positions.length; i += 3)
    box.expandByPoint(position.set(t.positions[i], t.positions[i + 1], t.positions[i + 2]));
  return box;
}

/** Rotate about Y, then move/scale so the reference box sits centred on the origin, base at y=0. */
export function normalizer(reference: THREE.Box3, options: { rotate?: number; fit: Fit }) {
  const rotation = new THREE.Matrix4().makeRotationY(((options.rotate ?? 0) * Math.PI) / 180);
  const box = reference.clone().applyMatrix4(rotation);
  const size = box.getSize(new THREE.Vector3());
  const scale =
    'height' in options.fit
      ? options.fit.height / size.y
      : 'width' in options.fit
        ? options.fit.width / Math.max(size.x, size.z)
        : options.fit.scale;
  const center = box.getCenter(new THREE.Vector3());
  return new THREE.Matrix4()
    .makeScale(scale, scale, scale)
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z))
    .multiply(rotation);
}

export type Fit = { height: number } | { width: number } | { scale: number };

export function transform(t: Triangles, matrix: THREE.Matrix4, offset?: THREE.Vector3) {
  for (let i = 0; i < t.positions.length; i += 3) {
    position.set(t.positions[i], t.positions[i + 1], t.positions[i + 2]).applyMatrix4(matrix);
    if (offset) position.sub(offset);
    t.positions[i] = position.x;
    t.positions[i + 1] = position.y;
    t.positions[i + 2] = position.z;
  }
  return t;
}
