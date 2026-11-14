/**
 * Node-side model loading for the bake pipeline. Three's loaders run without a DOM once embedded
 * images are removed from the glTF JSON; textures are decoded separately with pngjs so colours can be
 * sampled per vertex.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { PNG } from 'pngjs';
import type * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// three's FileLoader reports progress with the DOM ProgressEvent; Node only has Event.
const scope = globalThis as { ProgressEvent?: unknown };
scope.ProgressEvent ??= class extends Event {
  constructor(
    type: string,
    init: { lengthComputable?: boolean; loaded?: number; total?: number } = {}
  ) {
    super(type);
    Object.assign(this, init);
  }
};

export type Image = { width: number; height: number; data: Uint8Array };
export type Loaded = {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
  /** Decoded base-colour texture per material name. */
  textures: Map<string, Image>;
};

type GltfJson = {
  images?: { uri?: string; bufferView?: number; mimeType?: string }[];
  textures?: { source?: number }[];
  samplers?: unknown[];
  bufferViews?: { buffer: number; byteOffset?: number; byteLength: number }[];
  materials?: { name?: string; pbrMetallicRoughness?: { baseColorTexture?: { index: number } } }[];
};

function decodePng(bytes: Uint8Array): Image {
  const png = PNG.sync.read(Buffer.from(bytes));
  return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
}

function splitGlb(buffer: Buffer): { json: GltfJson; bin: Buffer | null } {
  if (buffer.readUInt32LE(0) !== 0x46546c67)
    return { json: JSON.parse(buffer.toString()), bin: null };
  let offset = 12,
    json: GltfJson | null = null,
    bin: Buffer | null = null;
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset),
      type = buffer.readUInt32LE(offset + 4),
      chunk = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
    else if (type === 0x004e4942) bin = chunk;
    offset += 8 + length;
  }
  if (!json) throw new Error('GLB without JSON chunk');
  return { json, bin };
}

function joinGlb(json: GltfJson, bin: Buffer | null): ArrayBuffer {
  const text = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.concat([text, Buffer.alloc((4 - (text.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  const chunks: Buffer[] = [];
  const chunkHeader = (length: number, type: number) => {
    const h = Buffer.alloc(8);
    h.writeUInt32LE(length, 0);
    h.writeUInt32LE(type, 4);
    return h;
  };
  chunks.push(chunkHeader(jsonChunk.length, 0x4e4f534a), jsonChunk);
  if (bin) {
    const padded = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
    chunks.push(chunkHeader(padded.length, 0x004e4942), padded);
  }
  const body = Buffer.concat(chunks);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + body.length, 8);
  const out = Buffer.concat([header, body]);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}

async function loadGltf(file: string): Promise<Loaded> {
  const raw = readFileSync(file);
  const { json, bin } = splitGlb(raw);
  const textures = new Map<string, Image>();
  // Decode every material's base colour texture before the images are stripped.
  for (const material of json.materials ?? []) {
    const index = material.pbrMetallicRoughness?.baseColorTexture?.index;
    if (index == null) continue;
    const image = json.images?.[json.textures?.[index]?.source ?? -1];
    if (!image) continue;
    let bytes: Uint8Array | null = null;
    if (image.uri && !image.uri.startsWith('data:'))
      bytes = readFileSync(join(dirname(file), decodeURIComponent(image.uri)));
    else if (image.uri) bytes = Buffer.from(image.uri.split(',')[1], 'base64');
    else if (image.bufferView != null && bin) {
      const view = json.bufferViews![image.bufferView];
      bytes = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    }
    if (bytes) textures.set(material.name ?? '', decodePng(bytes));
    delete material.pbrMetallicRoughness!.baseColorTexture;
  }
  delete json.images;
  delete json.textures;
  delete json.samplers;
  const loader = new GLTFLoader();
  const base = 'file://' + dirname(file) + '/';
  // External .bin buffers are inlined so the loader does not need fetch().
  const buffers = (json as { buffers?: { uri?: string }[] }).buffers;
  if (bin === null && buffers)
    for (const buffer of buffers)
      if (buffer.uri && !buffer.uri.startsWith('data:')) {
        const data = readFileSync(join(dirname(file), decodeURIComponent(buffer.uri)));
        buffer.uri = 'data:application/octet-stream;base64,' + data.toString('base64');
      }
  const input = bin ? joinGlb(json, bin) : JSON.stringify(json);
  const gltf = await new Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] }>(
    (resolve, reject) => loader.parse(input, base, resolve, reject)
  );
  return { scene: gltf.scene, animations: gltf.animations, textures };
}

function loadObj(file: string): Loaded {
  const mtlFile = file.replace(/\.obj$/, '.mtl');
  const materials = new MTLLoader().parse(readFileSync(mtlFile, 'utf8'), '');
  materials.preload();
  const scene = new OBJLoader().setMaterials(materials).parse(readFileSync(file, 'utf8'));
  return { scene, animations: [], textures: new Map() };
}

export async function loadModel(file: string): Promise<Loaded> {
  return file.endsWith('.obj') ? loadObj(file) : loadGltf(file);
}
