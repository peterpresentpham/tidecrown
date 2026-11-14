import * as THREE from 'three';

/**
 * Baked CC0 static models (Quaternius, Kenney) from `npm run models`. Every model is flat,
 * vertex-coloured geometry so the world keeps one material, fog-of-war shading and batching.
 * Vertices flagged in the bake take the faction colour, scaled by their stored brightness.
 */
export class ModelLibrary {
  private entries = new Map<string, number[]>();
  private anchors = new Map<string, THREE.Vector3>();
  private templates = new Map<string, THREE.BufferGeometry>();
  private body: number;

  constructor(private buffer: ArrayBuffer) {
    const view = new DataView(buffer);
    const magic = new TextDecoder().decode(new Uint8Array(buffer, 0, 4));
    if (magic !== 'NMD1') throw new Error('Unknown model library format');
    const length = view.getUint32(4, true);
    const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 8, length))) as {
      models: Record<string, number[]>;
      anchors: Record<string, number[]>;
    };
    this.body = 8 + length;
    for (const [name, entry] of Object.entries(header.models)) this.entries.set(name, entry);
    for (const [name, p] of Object.entries(header.anchors))
      this.anchors.set(name, new THREE.Vector3(p[0], p[1], p[2]));
  }

  has(name: string) {
    return this.entries.has(name);
  }

  anchor(name: string) {
    return this.anchors.get(name)?.clone() ?? new THREE.Vector3();
  }

  /**
   * A fresh geometry (callers own and dispose it) with position, normal and linear colour.
   * `team` tints the faction-flagged vertices; without it they keep a neutral cloth tone.
   */
  geometry(name: string, team = '#c8b48a'): THREE.BufferGeometry {
    const key = name + team;
    let template = this.templates.get(key);
    if (!template) {
      const entry = this.entries.get(name);
      if (!entry) throw new Error(`Missing model ${name}`);
      const [vertices, count, pos, col, idx, wide] = entry;
      const positions = new Float32Array(this.buffer, this.body + pos, vertices * 3);
      const bytes = new Uint8Array(this.buffer, this.body + col, vertices * 4);
      const indices = wide
        ? new Uint32Array(this.buffer, this.body + idx, count)
        : new Uint16Array(this.buffer, this.body + idx, count);
      const tint = new THREE.Color(team);
      const color = new THREE.Color();
      const colors = new Float32Array(vertices * 3);
      for (let i = 0; i < vertices; i++) {
        const r = bytes[i * 4],
          g = bytes[i * 4 + 1],
          b = bytes[i * 4 + 2];
        if (bytes[i * 4 + 3] === 255) color.copy(tint).multiplyScalar(r / 128);
        else color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      template = new THREE.BufferGeometry();
      template.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
      template.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      template.setIndex(new THREE.BufferAttribute(indices.slice(), 1));
      template.computeVertexNormals();
      template.computeBoundingSphere();
      this.templates.set(key, template);
    }
    return template.clone();
  }

  dispose() {
    this.templates.forEach((g) => g.dispose());
    this.templates.clear();
  }
}

let loading: Promise<ModelLibrary | null> | null = null;
let loaded: ModelLibrary | null = null;

/** Starts (once) and returns the library; resolves null if the file cannot be loaded. */
export function loadModels(): Promise<ModelLibrary | null> {
  loading ??= import('./assets/models.bin?url')
    .then(({ default: url }) => fetch(url))
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
    .then((buffer) => (loaded = new ModelLibrary(buffer)))
    .catch((error: unknown) => {
      console.warn('3D models unavailable, using simple shapes', error);
      return null;
    });
  return loading;
}

/** The library if it has already finished loading, so first frames can use it synchronously. */
export function loadedModels() {
  return loaded;
}
