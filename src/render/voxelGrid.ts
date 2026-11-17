/**
 * Voxel grids and their meshes, shared by the soldiers (voxel.ts) and the scenery
 * (voxelScenery.ts). Colours are CSS strings; TEAM marks cells that take the faction colour.
 */
import * as THREE from 'three';

/** Voxel edge in world units (a tile is 1.9 ≈ 25 voxels; a soldier ~20 voxels tall). */
export const VOXEL = 0.075;
export const TEAM = 'team';

export class Grid {
  readonly cells = new Map<string, string>();
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: string) {
    for (let i = x; i < x + w; i++)
      for (let j = y; j < y + h; j++)
        for (let k = z; k < z + d; k++) this.cells.set(`${i},${j},${k}`, color);
    return this;
  }
  set(x: number, y: number, z: number, color: string) {
    this.cells.set(`${x},${y},${z}`, color);
    return this;
  }
  get(x: number, y: number, z: number) {
    return this.cells.get(`${x},${y},${z}`);
  }
  clear(x: number, y: number, z: number) {
    this.cells.delete(`${x},${y},${z}`);
    return this;
  }
  /** Removes a box of cells (doorways, holes). */
  carve(x: number, y: number, z: number, w: number, h: number, d: number) {
    for (let i = x; i < x + w; i++)
      for (let j = y; j < y + h; j++) for (let k = z; k < z + d; k++) this.clear(i, j, k);
    return this;
  }
  /** Fills an ellipsoid; `color` may vary per cell (e.g. two-tone foliage). */
  blob(
    cx: number,
    cy: number,
    cz: number,
    rx: number,
    ry: number,
    rz: number,
    color: string | ((x: number, y: number, z: number) => string)
  ) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
          const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2;
          if (d <= 1) this.set(x, y, z, typeof color === 'string' ? color : color(x, y, z));
        }
    return this;
  }
  /** Copies another grid in at an offset. */
  add(other: Grid, dx = 0, dy = 0, dz = 0) {
    for (const [key, color] of other.cells) {
      const [x, y, z] = key.split(',').map(Number);
      this.set(x + dx, y + dy, z + dz, color);
    }
    return this;
  }
}

/** Deterministic pseudo-random numbers in [0, 1) for a seed string. */
export function random(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const hash = (x: number, y: number, z: number) => {
  const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return v - Math.floor(v);
};

/** Faction colour variants: darker trim and lighter highlights in the owner's colour. */
export const TEAM_DARK = 'teamDark';
export const TEAM_LIGHT = 'teamLight';

/** A CSS colour scaled in brightness (f < 1 darker, > 1 lighter), as a hex string. */
export function shade(css: string, f: number) {
  const c = new THREE.Color(css);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, hsl.l * f));
  return `#${c.getHexString()}`;
}

/** Each cell becomes a k×k×k block (cell x maps to k·x … k·x + k − 1). */
export function upscale(grid: Grid, k: number) {
  const out = new Grid();
  for (const [key, color] of grid.cells) {
    const [x, y, z] = key.split(',').map(Number);
    out.box(x * k, y * k, z * k, k, k, k, color);
  }
  return out;
}

export type MeshOptions = {
  /** Shift in voxels before scaling (centring a part on its pivot). */
  offset?: [number, number, number];
  /** Merge coplanar same-colour faces into rectangles. */
  greedy?: boolean;
  /** Darken face corners next to other voxels (ambient occlusion), as voxel editors render. */
  ao?: boolean;
  /** Voxel edge in world units. */
  size?: number;
};

/** Corner brightness by the number of occluding neighbours (3 = open, 0 = deep crease). */
const AO_SHADE = [0.52, 0.7, 0.86, 1];

/**
 * Exposed faces as triangles (position, normal, linear vertex colour). `greedy` merges coplanar
 * same-colour faces into rectangles; otherwise every voxel face is its own quad with a slight
 * per-voxel shade, like hand-painted voxel art. With `ao`, faces whose corners are equally lit
 * still merge; creased ones stay single so their corners can shade.
 */
export function meshGrid(grid: Grid, team: string, options: MeshOptions = {}) {
  const { offset = [0, 0, 0], greedy = false, ao = false, size = VOXEL } = options;
  const positions: number[] = [],
    normals: number[] = [],
    colors: number[] = [];
  const color = new THREE.Color();
  const tokens: Record<string, string> = {
    [TEAM]: team,
    [TEAM_DARK]: shade(team, 0.68),
    [TEAM_LIGHT]: shade(team, 1.25),
  };
  const resolve = (value: string) => color.set(tokens[value] ?? value);
  const quad = (corners: number[][], normal: number[], shades: number[]) => {
    // Split along the brighter diagonal so occlusion gradients do not crease the wrong way.
    const flip = shades[0] + shades[2] < shades[1] + shades[3];
    const [a, b, c] = flip ? [corners[1], corners[2], corners[3]] : corners;
    const cross = [
      (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
      (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
      (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
    ];
    const outward = cross[0] * normal[0] + cross[1] * normal[1] + cross[2] * normal[2] >= 0;
    const base = flip ? [1, 2, 3, 1, 3, 0] : [0, 1, 2, 0, 2, 3];
    // Wind counter-clockwise around the outward normal.
    const order = outward ? base : [base[0], base[2], base[1], base[3], base[5], base[4]];
    for (const i of order) {
      positions.push(
        (corners[i][0] + offset[0]) * size,
        (corners[i][1] + offset[1]) * size,
        (corners[i][2] + offset[2]) * size
      );
      normals.push(...normal);
      colors.push(color.r * shades[i], color.g * shades[i], color.b * shades[i]);
    }
  };
  const filled = (x: number, y: number, z: number) => grid.cells.has(`${x},${y},${z}`);
  /** Occlusion of the four corners (du, dv) = (0,0), (1,0), (1,1), (0,1) of a face. */
  const occlusion = (p: number[], n: number[], u: number, v: number) =>
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ].map(([du, dv]) => {
      const q = [p[0] + n[0], p[1] + n[1], p[2] + n[2]];
      const a = [...q],
        b = [...q],
        c = [...q];
      a[u] += du ? 1 : -1;
      b[v] += dv ? 1 : -1;
      c[u] += du ? 1 : -1;
      c[v] += dv ? 1 : -1;
      const s1 = filled(a[0], a[1], a[2]) ? 1 : 0,
        s2 = filled(b[0], b[1], b[2]) ? 1 : 0,
        corner = filled(c[0], c[1], c[2]) ? 1 : 0;
      return s1 && s2 ? 0 : 3 - s1 - s2 - corner;
    });
  const cells = [...grid.cells].map(([key, value]) => {
    const [x, y, z] = key.split(',').map(Number);
    return { x, y, z, value };
  });
  if (!greedy) {
    for (const { x, y, z, value } of cells) {
      const p = [x, y, z];
      const jitter = 0.94 + hash(x, y, z) * 0.1;
      for (let d = 0; d < 3; d++)
        for (const s of [1, -1]) {
          const n = [0, 0, 0];
          n[d] = s;
          if (filled(x + n[0], y + n[1], z + n[2])) continue;
          const u = (d + 1) % 3,
            v = (d + 2) % 3;
          const plane = p[d] + (s > 0 ? 1 : 0);
          const corner = (du: number, dv: number) => {
            const c = [0, 0, 0];
            c[d] = plane;
            c[u] = p[u] + du;
            c[v] = p[v] + dv;
            return c;
          };
          resolve(value);
          const shades = ao
            ? occlusion(p, n, u, v).map((o) => AO_SHADE[o] * jitter)
            : [jitter, jitter, jitter, jitter];
          quad([corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)], n, shades);
        }
    }
  } else if (cells.length) {
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity];
    for (const { x, y, z } of cells)
      [x, y, z].forEach((v, i) => {
        min[i] = Math.min(min[i], v);
        max[i] = Math.max(max[i], v);
      });
    for (let d = 0; d < 3; d++) {
      const u = (d + 1) % 3,
        v = (d + 2) % 3;
      const nu = max[u] - min[u] + 1,
        nv = max[v] - min[v] + 1;
      for (const s of [1, -1]) {
        const n = [0, 0, 0];
        n[d] = s;
        for (let slice = min[d]; slice <= max[d]; slice++) {
          // Mask entries: colour plus corner occlusion; only uniformly lit faces merge.
          const mask: (
            { key: string; color: string; ao: number[]; uniform: boolean } | undefined
          )[] = new Array(nu * nv);
          const p = [0, 0, 0];
          for (let j = 0; j < nv; j++)
            for (let i = 0; i < nu; i++) {
              p[d] = slice;
              p[u] = min[u] + i;
              p[v] = min[v] + j;
              const here = grid.get(p[0], p[1], p[2]);
              if (here === undefined) continue;
              if (filled(p[0] + n[0], p[1] + n[1], p[2] + n[2])) continue;
              const corners = ao ? occlusion(p, n, u, v) : [3, 3, 3, 3];
              const uniform = corners.every((c) => c === corners[0]);
              mask[j * nu + i] = {
                key: `${here}|${corners.join('')}`,
                color: here,
                ao: corners,
                uniform,
              };
            }
          for (let j = 0; j < nv; j++)
            for (let i = 0; i < nu;) {
              const cell = mask[j * nu + i];
              if (cell === undefined) {
                i++;
                continue;
              }
              let w = 1,
                h = 1;
              if (cell.uniform) {
                while (i + w < nu && mask[j * nu + i + w]?.key === cell.key) w++;
                grow: while (j + h < nv) {
                  for (let k = 0; k < w; k++)
                    if (mask[(j + h) * nu + i + k]?.key !== cell.key) break grow;
                  h++;
                }
              }
              for (let jj = 0; jj < h; jj++)
                for (let ii = 0; ii < w; ii++) mask[(j + jj) * nu + i + ii] = undefined;
              const plane = slice + (s > 0 ? 1 : 0);
              const corner = (du: number, dv: number) => {
                const c = [0, 0, 0];
                c[d] = plane;
                c[u] = min[u] + i + du;
                c[v] = min[v] + j + dv;
                return c;
              };
              resolve(cell.color);
              const jitter = 0.95 + hash(min[u] + i, min[v] + j, slice) * 0.08;
              quad(
                [corner(0, 0), corner(w, 0), corner(w, h), corner(0, h)],
                n,
                cell.ao.map((o) => AO_SHADE[o] * jitter)
              );
              i += w;
            }
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}
