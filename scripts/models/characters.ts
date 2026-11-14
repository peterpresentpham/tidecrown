/**
 * Packs the Quaternius character sources into small self-contained GLB files that the game loads
 * at runtime (skinned meshes + skeletal animation), in src/render/assets/units/.
 *
 *   npm run characters -- <source-dir>
 *
 * <source-dir> layout (free "Standard" downloads, all CC0; links in docs/architecture.md):
 *   characters/outfits/  Modular Character Outfits - Fantasy (unzipped)
 *   characters/ubc/      Universal Base Characters (unzipped)
 *   characters/ual/      Universal Animation Library (unzipped)
 *   extra/               Horse.glb, Horse_White.glb (Ultimate Animated Animals)
 *   weapons/             Medieval Weapons pack .glb files
 *   knight/              Animated Knight pack Helmet*.glb, ShoulderPads.glb
 *
 * Only base colour textures are kept (512 px). Outfit textures carry a faction mask in alpha:
 * 255 = keep the texel, 1..254 = faction colour times alpha/128 (see characters.ts).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { Accessor, type Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { compactPrimitive, dedup, prune, quantize, resample } from '@gltf-transform/functions';
import { PNG } from 'pngjs';

const root = process.argv[2];
if (!root) {
  console.error('Usage: npm run characters -- <source-dir>');
  process.exit(1);
}
const OUT = join(import.meta.dirname, '../../src/render/assets/units');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const OUTFITS =
  'characters/outfits/Modular Character Outfits - Fantasy[Standard]/Exports/glTF (Godot-Unreal)/Outfits';
const UBC = 'characters/ubc/Universal Base Characters[Standard]';
const UAL = 'characters/ual/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb';

/** Animations the game plays (see CLIPS in src/render/characters.ts). */
const HUMAN_CLIPS = [
  'Idle_Loop',
  'Walk_Loop',
  'Jog_Fwd_Loop',
  'Sword_Attack',
  'Pistol_Shoot',
  'Spell_Simple_Shoot',
  'Fixing_Kneeling',
  'Hit_Chest',
  'Death01',
  'Sitting_Idle_Loop',
];
const HORSE_CLIPS = ['Idle', 'Walk', 'Gallop', 'Attack_Kick', 'Idle_HitReact_Left', 'Death'].map(
  (n) => `AnimalArmature|${n}`
);

type Mask = (h: number, s: number, l: number) => boolean;
/** Ranger cloth is green; the peasant's light shirt and trousers take the faction colour. */
const MASKS: Record<string, Mask> = {
  T_Ranger_BaseColor: (h, s, l) => h >= 70 && h <= 170 && s > 0.2 && l > 0.06,
  T_Peasant_BaseColor: (h, s, l) => h >= 25 && h <= 70 && s < 0.4 && l > 0.55 && l < 0.92,
};

function hsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min,
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) * 60
      : max === g
        ? ((b - r) / d + 2) * 60
        : ((r - g) / d + 4) * 60;
  return [h, s, l];
}

/** Box-downsamples a PNG to at most `size` px and writes the faction mask into alpha. */
function shrink(bytes: Uint8Array, name: string, size = 512) {
  const src = PNG.sync.read(Buffer.from(bytes));
  const factor = Math.max(1, Math.round(src.width / size));
  const w = Math.max(1, Math.floor(src.width / factor)),
    h = Math.max(1, Math.floor(src.height / factor));
  const out = new PNG({ width: w, height: h });
  const mask = Object.entries(MASKS).find(([key]) => name.startsWith(key))?.[1];
  const lum: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sum = [0, 0, 0];
      for (let dy = 0; dy < factor; dy++)
        for (let dx = 0; dx < factor; dx++) {
          const i = ((y * factor + dy) * src.width + x * factor + dx) * 4;
          for (let c = 0; c < 3; c++) sum[c] += src.data[i + c];
        }
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) out.data[o + c] = Math.round(sum[c] / factor / factor);
      out.data[o + 3] = 255;
      if (mask) {
        const [r, g, b] = [0, 1, 2].map((c) => out.data[o + c] / 255);
        const [hue, sat, light] = hsl(r, g, b);
        if (mask(hue, sat, light)) lum[o / 4] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
    }
  if (mask) {
    // Brightness relative to the masked area's mean keeps folds and seams after tinting.
    const values = lum.filter((v) => v !== undefined);
    const mean = values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
    lum.forEach((v, i) => {
      if (v !== undefined)
        out.data[i * 4 + 3] = Math.max(1, Math.min(254, Math.round((v / mean) * 128)));
    });
  }
  return new Uint8Array(PNG.sync.write(out));
}

/** Keeps base colour only, shrinks it, strips extra animations, then compacts the file. */
async function pack(doc: Document, out: string, clips?: string[]) {
  const r = doc.getRoot();
  for (const material of r.listMaterials()) {
    material.setNormalTexture(null);
    material.setOcclusionTexture(null);
    material.setMetallicRoughnessTexture(null);
    material.setRoughnessFactor(0.85);
    material.setMetallicFactor(0);
  }
  await doc.transform(prune());
  for (const texture of r.listTextures()) {
    const image = texture.getImage();
    if (!image || texture.getMimeType() !== 'image/png') continue;
    texture.setImage(shrink(image, texture.getName() || texture.getURI().replace(/\.png$/, '')));
    texture.setURI(texture.getURI() || `${texture.getName()}.png`);
  }
  if (clips)
    for (const animation of r.listAnimations()) {
      if (!clips.includes(animation.getName())) {
        // Disposing an animation leaves its samplers (and their keyframes) alive.
        for (const channel of animation.listChannels()) channel.dispose();
        for (const sampler of animation.listSamplers()) sampler.dispose();
        animation.dispose();
        continue;
      }
      // Finger curls are invisible at game zoom; dropping them halves the file.
      for (const channel of animation.listChannels()) {
        const node = channel.getTargetNode()?.getName() ?? '';
        if (
          /^(index|middle|pinky|ring|thumb)_|_leaf/.test(node) ||
          // Only the hips move the body; other bones just rotate.
          (channel.getTargetPath() !== 'rotation' && !/^(pelvis|root)$/.test(node))
        ) {
          channel.getSampler()?.dispose();
          channel.dispose();
        }
      }
    }
  await doc.transform(prune(), resample({ tolerance: 0.002 }), prune(), dedup(), quantize());
  // prune() keeps accessors that only the root still lists (left over from removed clips).
  for (const accessor of r.listAccessors())
    if (accessor.listParents().every((p) => p === r)) accessor.dispose();
  // Rotation keyframes as normalized int16 (core glTF allows it; ~half the size of float).
  for (const animation of r.listAnimations())
    for (const sampler of animation.listSamplers()) {
      const output = sampler.getOutput()!;
      if (output.getType() !== 'VEC4' || output.getComponentType() !== Accessor.ComponentType.FLOAT)
        continue;
      const values = output.getArray() as Float32Array;
      output.setArray(
        new Int16Array(values.map((v) => Math.round(Math.max(-1, Math.min(1, v)) * 32767)))
      );
      output.setNormalized(true);
    }
  const glb = await io.writeBinary(doc);
  writeFileSync(join(OUT, out), glb);
  console.log(`${out}: ${(glb.length / 1024).toFixed(0)} KB`);
}

/** Reads a .gltf whose image list names a few files that ship under another name ("x_png.png"). */
async function read(path: string) {
  if (!path.endsWith('.gltf')) return io.read(path);
  const json = JSON.parse(readFileSync(path, 'utf8'));
  const resources: Record<string, Uint8Array<ArrayBuffer>> = {};
  for (const item of [...(json.buffers ?? []), ...(json.images ?? [])]) {
    if (!item.uri) continue;
    const file = [item.uri, item.uri.replace(/_png\.png$/, '.png')]
      .map((u: string) => join(dirname(path), decodeURIComponent(u)))
      .find(existsSync);
    if (file) resources[item.uri] = new Uint8Array(readFileSync(file));
  }
  return io.readJSON({ json, resources });
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const outfit of ['Male_Ranger', 'Female_Ranger', 'Male_Peasant', 'Female_Peasant'])
  await pack(await read(join(root, OUTFITS, `${outfit}.gltf`)), `${outfit}.glb`);

/** Keeps the triangles skinned mostly to the head and neck: the body would poke through clothes. */
function keepHead(doc: Document) {
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(),
      skin = node.getSkin();
    if (!mesh || !skin) continue;
    const head = new Set(
      skin
        .listJoints()
        .map((j, i) => (['Head', 'neck_01'].includes(j.getName()) ? i : -1))
        .filter((i) => i >= 0)
    );
    for (const primitive of mesh.listPrimitives()) {
      if (!/Superhero/i.test(primitive.getMaterial()?.getName() ?? '')) continue;
      const joints = primitive.getAttribute('JOINTS_0')!,
        weights = primitive.getAttribute('WEIGHTS_0')!,
        indices = primitive.getIndices()!;
      const j: number[] = [],
        w: number[] = [];
      const weight = (v: number) => {
        joints.getElement(v, j);
        weights.getElement(v, w);
        return j.reduce((sum, joint, k) => sum + (head.has(joint) ? w[k] : 0), 0);
      };
      const kept: number[] = [];
      for (let i = 0; i < indices.getCount(); i += 3) {
        const tri = [indices.getScalar(i), indices.getScalar(i + 1), indices.getScalar(i + 2)];
        if (tri.every((v) => weight(v) > 0.5)) kept.push(...tri);
      }
      indices.setArray(new Uint32Array(kept));
      compactPrimitive(primitive);
    }
  }
  return doc;
}

for (const base of ['Male', 'Female'])
  await pack(
    keepHead(
      await read(join(root, UBC, 'Base Characters/Godot - UE', `Superhero_${base}_FullBody.gltf`))
    ),
    `Head_${base}.glb`
  );

const HAIR = join(root, UBC, 'Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)');
for (const hair of ['Hair_SimpleParted', 'Hair_Buzzed', 'Hair_Beard', 'Hair_Buns', 'Hair_Long'])
  await pack(await read(join(HAIR, `${hair}.gltf`)), `${hair}.glb`);

// Animations only: drop the mannequin mesh, keep the skeleton nodes the clips target.
const animations = await read(join(root, UAL));
for (const node of animations.getRoot().listNodes()) {
  node.setMesh(null);
  node.setSkin(null);
}
await pack(animations, 'Animations.glb', HUMAN_CLIPS);

for (const horse of ['Horse', 'Horse_White'])
  await pack(await read(join(root, 'extra', `${horse}.glb`)), `${horse}.glb`, HORSE_CLIPS);

for (const dir of ['weapons', 'knight'])
  for (const file of readdirSync(join(root, dir)).filter((f) => f.endsWith('.glb')))
    await pack(await read(join(root, dir, file)), file);
