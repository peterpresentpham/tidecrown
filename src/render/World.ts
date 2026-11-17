import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

import {
  type ActionEvent,
  type City,
  cityAt,
  distance,
  FACTIONS,
  hasBuilding,
  previewAttack,
  reachable,
  type State,
  type Tile,
  tileAt,
  type Unit,
  UNITS,
} from '../game/engine';
import { isExplored, isVisible, observe } from '../game/visibility';
import { TapGesture } from '../ui/interaction';
import {
  actionSeconds,
  type AISpeed,
  DEFAULT_UI_PREFERENCES,
  type GraphicsQuality,
} from '../ui/playbackPolicy';
import type { Character, Pose } from './characters';
import { buildUnitModel } from './unitModels';
import { FACTION_SYMBOL } from './visualIdentity';
import { VOXEL_LOOKS, voxelSoldiers } from './voxel';
import { type VoxelScenery, voxelScenery } from './voxelScenery';

export function worldPoint(tile: { q: number; r: number }, y = 0) {
  return new THREE.Vector3(tile.q * 1.9, y, tile.r * 1.9);
}
const COLORS = {
  grass: ['#71984e', '#749b50', '#6e954d'],
  forest: ['#608745', '#658a47'],
  hill: ['#9aa66a', '#93a065'],
  mountain: ['#8c998c'],
  sand: ['#d3c39a', '#dfcea5'],
  water: ['#4a8c9b'],
  unknown: ['#0b161c'],
};
const pickColor = (t: Tile) =>
  COLORS[t.terrain][Math.abs(t.q * 7 + t.r * 3) % COLORS[t.terrain].length];

// 30 FPS cap. Two 60 Hz vsync ticks sum to ~33.3 ms with jitter on either side of 1/30 s; without the
// tolerance about half of the frames slip to a third tick and motion runs near 20 FPS.
const FRAME_BUDGET = 1 / 30 - 0.004;
/** Opening zoom: close enough that soldiers read clearly (about 9 × 6 tiles on a wide screen). */
export const DEFAULT_ZOOM = 1.75;
const MAX_ZOOM = 2.8;

/** Presentation settings only; none of these change State, fog or rules. */
export type WorldVisualSettings = {
  quality?: GraphicsQuality;
  aiSpeed?: AISpeed;
  reducedMotion?: boolean;
};
export type WorldOptions = WorldVisualSettings & { onVisualEnd?: (eventId: number) => void };

/**
 * Events of `observed` not yet animated, and the new high-water mark. The mark comes from the raw
 * state: observe() zeroes `serial`, and a zero mark would replay the whole event queue on every sync.
 */
export function unseenEvents(raw: State, observed: State, last: number | undefined) {
  const events = (observed.events ?? (observed.event ? [observed.event] : [])).filter(
    (e) => e.id > (last ?? 0)
  );
  return { events, last: Math.max(last ?? 0, raw.serial) };
}

export class World {
  private renderedFrames = 0;
  private scene = new THREE.Scene();
  private fogTexture = new THREE.DataTexture(new Uint8Array(33 * 25 * 4), 33, 25, THREE.RGBAFormat);
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private staticGroup = new THREE.Group();
  private mapBatch = new THREE.Group();
  private mapGroups = new Map<string, THREE.Group>();
  private cities = new THREE.Group();
  private troops = new THREE.Group();
  private highlights = new THREE.Group();
  private hoverGroup = new THREE.Group();
  private sun: THREE.DirectionalLight;
  private quality: GraphicsQuality = DEFAULT_UI_PREFERENCES.graphics;
  private aiSpeed: AISpeed = DEFAULT_UI_PREFERENCES.aiSpeed;
  private onVisualEnd?: (eventId: number) => void;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private tileMeshes: THREE.Object3D[] = [];
  private state: State;
  /** Last raw state passed to sync, so the scene can be rebuilt when models finish loading. */
  private raw: State | null = null;
  /** Voxel scenery and soldiers are generated in code, so they exist from the first frame. */
  private models: VoxelScenery | null = voxelScenery();
  /** Full quality draws the fine soldiers (double resolution, corner shading). */
  private get characters() {
    return voxelSoldiers(this.quality === 'normal' ? 'high' : 'basic');
  }
  private labelLayer: HTMLDivElement;
  private labels: {
    el: HTMLButtonElement;
    pos: THREE.Vector3;
    follow?: THREE.Group;
    /** Height above a followed unit. */
    lift?: number;
  }[] = [];
  private unitModels = new Map<string, THREE.Group>();
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private geometries: THREE.BufferGeometry[] = [];
  private frame = 0;
  private observer: ResizeObserver;
  private tap = new TapGesture();
  private visualQueue: { event: ActionEvent; ghosts: THREE.Group[] }[] = [];
  private hovered: string | null = null;
  private selectedUnit: string | null = null;
  private selectedTile: string | null = null;
  private showGrid = false;
  private actionTiles: string[] = [];
  private reduced: boolean;
  private disposed = false;
  private lastEvent: number | undefined;
  private mapSignatures = new Map<string, string>();
  private effectGroup = new THREE.Group();
  private pathGroup = new THREE.Group();
  private dangerGroup = new THREE.Group();
  private batchSignature = '';
  private visual: {
    event: ActionEvent;
    time: number;
    duration: number;
    actorBase?: THREE.Vector3;
    targetBase?: THREE.Vector3;
    projectile?: THREE.Mesh;
    impact?: THREE.Mesh;
    ghosts: THREE.Group[];
    labels: { el: HTMLDivElement; point: THREE.Vector3; start: number }[];
  } | null = null;
  private renderTime = 0;
  private needsDraw = true;
  private paused = false;
  private requestDraw = () => {
    this.needsDraw = true;
  };
  private clock = new THREE.Clock();
  constructor(
    private container: HTMLElement,
    state: State,
    private onSelect: (id: string, city?: boolean) => void,
    private onHover: (id: string | null) => void,
    options: WorldOptions = {}
  ) {
    this.state = observe(state, 'player');
    this.lastEvent = state.serial;
    this.reduced =
      options.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.quality = options.quality ?? this.quality;
    this.aiSpeed = options.aiSpeed ?? this.aiSpeed;
    this.onVisualEnd = options.onVisualEnd;
    this.fogTexture.magFilter = THREE.LinearFilter;
    this.fogTexture.minFilter = THREE.LinearFilter;
    this.fogTexture.generateMipmaps = false;
    this.scene.background = new THREE.Color('#0b161c');
    this.scene.fog = new THREE.Fog('#0b161c', 65, 115);
    this.camera = new THREE.OrthographicCamera(-18, 18, 15, -15, 0.1, 150);
    this.camera.position.set(12, 19, 16);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.shadowMap.enabled = this.quality === 'normal';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Bản đồ chiến thuật 3D. Chọn quân và ô đất bằng chuột; danh sách quân cũng có trong bảng điều khiển.'
    );
    container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.addEventListener('change', this.requestDraw);
    this.controls.enableRotate = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.minZoom = 0.3;
    this.controls.maxZoom = MAX_ZOOM;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
    this.controls.target.set(0, 0, 0);
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'world-labels';
    container.appendChild(this.labelLayer);
    const ambient = new THREE.HemisphereLight('#f6f2e4', '#58766a', 1.85);
    this.scene.add(ambient);
    const sun = new THREE.DirectionalLight('#ffe4b8', 3.1);
    sun.position.set(-14, 26, 9);
    sun.castShadow = this.quality === 'normal';
    this.sun = sun;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 32;
    sun.shadow.camera.bottom = -32;
    sun.shadow.normalBias = 0.045;
    this.scene.add(
      sun,
      this.staticGroup,
      this.mapBatch,
      this.cities,
      this.troops,
      this.highlights,
      this.hoverGroup,
      this.pathGroup,
      this.dangerGroup,
      this.effectGroup
    );
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.buildMap();
    this.sync(state, null, null, false);
    this.resetCamera();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
    this.renderer.domElement.addEventListener('pointerdown', this.pointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.pointerUp);
    this.renderer.domElement.addEventListener('pointercancel', this.pointerCancel);
    this.renderer.domElement.addEventListener('pointermove', this.pointerMove);
    this.renderer.domElement.addEventListener('pointerleave', this.pointerLeave);
    this.renderer.domElement.addEventListener('contextmenu', this.contextMenu);
    window.addEventListener('keydown', this.keyDown);
    this.animate();
  }
  /** A scenery model as a vertex-coloured mesh (geometry owned by this world). */
  private model(name: string, parent: THREE.Object3D, team?: string) {
    const mesh = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(
      this.geometry(this.models!.geometry(name, team)),
      this.vertexMaterial()
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  private mat(color: string, opacity = 1) {
    const key = color + opacity;
    if (!this.materials.has(key)) {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.88,
        metalness: 0,
        flatShading: true,
        transparent: opacity < 1,
        opacity,
      });
      material.onBeforeCompile = (shader) => {
        shader.uniforms.nationFogMask = { value: this.fogTexture };
        shader.vertexShader =
          'varying vec2 vNationFogWorld;\n' +
          shader.vertexShader.replace(
            '#include <worldpos_vertex>',
            '#include <worldpos_vertex>\nvNationFogWorld=(modelMatrix*vec4(transformed,1.0)).xz;'
          );
        shader.fragmentShader =
          'uniform sampler2D nationFogMask;\nvarying vec2 vNationFogWorld;\n' +
          shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `#include <dithering_fragment>
          vec2 fogUV=vec2((vNationFogWorld.x/1.9+16.5)/33.0,(vNationFogWorld.y/1.9+12.5)/25.0);
          float charted=texture2D(nationFogMask,fogUV).r;
          float edgeVisibility=smoothstep(0.35,0.95,charted);
          gl_FragColor.rgb=mix(vec3(0.0034,0.0080,0.0102),gl_FragColor.rgb,edgeVisibility);
        `
          );
      };
      material.customProgramCacheKey = () => 'nation-exploration-v1';
      this.materials.set(key, material);
    }
    return this.materials.get(key)!;
  }
  /** Purely decorative parts that low quality hides; never units, cities, improvements or fog. */
  private decor(o: THREE.Object3D) {
    o.userData.decor = true;
    o.visible = this.quality !== 'low';
    return o;
  }
  private pixelRatio() {
    return this.quality !== 'normal' ? 1 : Math.min(window.devicePixelRatio, 1.5);
  }
  private geometry<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }
  private mesh(
    g: THREE.BufferGeometry,
    color: string,
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0
  ) {
    const m = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(
      this.geometry(g),
      this.mat(color)
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  private box(parent: THREE.Object3D, color: string, size: number[], pos: number[]) {
    return this.mesh(
      new THREE.BoxGeometry(...(size as [number, number, number])),
      color,
      parent,
      ...(pos as [number, number, number])
    );
  }
  private buildMap(tiles = this.state.tiles) {
    for (const t of tiles) {
      if (t.terrain === 'unknown') continue;
      const signature = JSON.stringify([
        t.terrain,
        t.height,
        t.improvement,
        t.road,
        t.bridge,
        t.road
          ? tiles
              .filter((n) => distance(t, n) === 1 && (n.road || cityAt(this.state, n.id)))
              .map((n) => n.id)
          : null,
        t.terrain === 'water' ? this.shoreSides(t).join('') : null,
      ]);
      if (this.mapSignatures.get(t.id) === signature) continue;
      const old = this.mapGroups.get(t.id);
      if (old) {
        this.clearGroup(old);
        this.staticGroup.remove(old);
        this.tileMeshes = this.tileMeshes.filter((o) => o.userData.tile !== t.id);
      }
      this.mapSignatures.set(t.id, signature);
      const parent = new THREE.Group();
      this.staticGroup.add(parent);
      this.mapGroups.set(t.id, parent);
      const p = worldPoint(t);
      const depth = t.terrain === 'water' ? 0.06 : t.height + 0.44;
      const shore = t.terrain === 'water' ? this.shoreSides(t) : [];
      const tile = this.mesh(
        new THREE.BoxGeometry(1.9, depth, 1.9),
        t.terrain === 'water' ? (shore.length ? '#5fa9b2' : '#3e8597') : pickColor(t),
        parent,
        p.x,
        t.terrain === 'water' ? -0.2 : (t.height - 0.44) / 2,
        p.z
      );
      tile.userData.tile = t.id;
      tile.castShadow = t.terrain !== 'water';
      this.tileMeshes.push(tile);
      this.improvementModel(parent, t, p);
      if (t.terrain === 'water') {
        tile.receiveShadow = false;
        // Pale foam along every edge that touches land.
        for (const [dq, dr] of shore) {
          const foam = this.mesh(
            new THREE.BoxGeometry(dq ? 0.16 : 1.9, 0.012, dq ? 1.9 : 0.16),
            '#d6efe8',
            parent,
            p.x + dq * 0.87,
            -0.165,
            p.z + dr * 0.87
          );
          foam.castShadow = false;
          this.decor(foam);
        }
        if ((t.q * 3 + t.r) % 5 === 0) {
          const wave = this.mesh(
            new THREE.BoxGeometry(0.45, 0.008, 0.017),
            '#b9d9d3',
            parent,
            p.x,
            -0.158,
            p.z
          );
          wave.castShadow = false;
          this.decor(wave);
        }
        continue;
      }
      if (this.state.cities.some((c) => c.tile === t.id)) continue;
      // Scenery appears once the model library has loaded.
      if (this.models) this.terrainModels(parent, t, p);
    }
    for (const group of this.mapGroups.values())
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          if (!o.userData.baseMaterial) {
            o.userData.baseMaterial = o.material;
            o.userData.baseShadow = o.castShadow;
          }
        }
      });
  }
  /** Directions [dq, dr] from a water tile to explored land neighbours. */
  private shoreSides(t: Tile): [number, number][] {
    return (
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as [number, number][]
    ).filter(([dq, dr]) => {
      const n = tileAt(this.state, `${t.q + dq},${t.r + dr}`);
      return !!n && n.terrain !== 'water' && n.terrain !== 'unknown';
    });
  }
  /** Library scenery for one tile: tree clusters, mountains, hill mounds and small decor. */
  private terrainModels(parent: THREE.Group, t: Tile, p: THREE.Vector3) {
    const hash = Math.abs((t.q * 73856093) ^ (t.r * 19349663));
    const pick = (names: string[]) => names[hash % names.length];
    const place = (name: string, x = 0, z = 0, scale = 1, turn = hash % 6) => {
      const m = this.model(name, parent);
      m.position.set(p.x + x, t.height, p.z + z);
      m.rotation.y = (turn * Math.PI) / 3;
      m.scale.setScalar(scale);
      m.userData.tile = t.id;
      return m;
    };
    const busy = !!(t.improvement || t.road || t.bridge);
    if (t.terrain === 'forest') {
      // Lumber camps thin the forest so the camp stays visible.
      if (t.improvement === 'lumber') place('forest_cut', -0.4, -0.35, 0.8);
      else place(pick(['forest_A', 'forest_B']));
    } else if (t.terrain === 'mountain') place(pick(['mountain_A', 'mountain_B', 'mountain_C']));
    else if (t.terrain === 'hill') {
      if (!busy) place(pick(['hill_A', 'hill_B']));
      else this.decor(place('rock_A', -0.55, -0.5));
      if (hash % 3 === 0) this.decor(place('bush', 0.55, 0.5));
    } else if (t.terrain === 'water') return;
    else if (busy) return;
    else if (hash % 13 === 0) this.decor(place('tree_common', 0.45, -0.4));
    else if (hash % 13 === 1) this.decor(place('tree_pine', -0.4, 0.35));
    else if (hash % 13 === 2) this.decor(place(pick(['rock_A', 'rock_B', 'rock_C']), 0.35, -0.3));
    else if (hash % 13 === 3) this.decor(place(pick(['bush', 'bush_berries']), -0.3, -0.35));
  }
  private updateMapFog(raw: State) {
    const data = this.fogTexture.image.data as Uint8Array;
    data.fill(0);
    for (const t of raw.tiles) {
      const offset = ((t.r + 12) * 33 + t.q + 16) * 4;
      const seen = isExplored(raw, 'player', t.id) ? 255 : 0;
      data[offset] = seen;
      data[offset + 1] = seen;
      data[offset + 2] = seen;
      data[offset + 3] = 255;
    }
    this.fogTexture.needsUpdate = true;
    for (const [id, group] of this.mapGroups) {
      group.visible = isExplored(raw, 'player', id);
      if (!group.visible) continue;
      const visible = isVisible(raw, 'player', id);
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const base = o.userData.baseMaterial as THREE.MeshStandardMaterial;
          o.material = visible
            ? base
            : this.mat(base.color.clone().multiplyScalar(0.24).getStyle());
          o.castShadow = visible && o.userData.baseShadow;
        }
      });
    }
  }
  private shadeMemory(g: THREE.Group) {
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const base = o.material as THREE.MeshStandardMaterial;
        o.material = base.vertexColors
          ? this.vertexMaterial(true)
          : this.mat(base.color.clone().multiplyScalar(0.24).getStyle());
        o.castShadow = false;
      }
    });
  }
  /** Cities from library buildings; the front-right corner stays free for a garrison unit. */
  private cityFromModels(city: City): THREE.Group {
    const g = new THREE.Group();
    const team = city.owner ? FACTIONS[city.owner].color : undefined;
    const place = (name: string, x: number, z: number, scale = 1, turn = 0) => {
      const m = this.model(name, g, team);
      m.position.set(x, 0, z);
      m.scale.setScalar(scale);
      m.rotation.y = turn;
      return m;
    };
    if (!city.owner) {
      place('home_A', -0.3, -0.25, 1, 0.5);
      place('home_B', 0.35, -0.35, 1, -0.4);
      place('well', -0.35, 0.45);
      this.decor(place('fence', 0.1, 0.55, 0.8, Math.PI / 2));
      return g;
    }
    if (city.fort > 0) {
      // Walls only on the far edges so they never hide units standing in the city.
      const wall = city.fort >= 20 ? 'wall_stone' : 'wall';
      place(wall, 0, -0.85);
      place(wall, -0.85, 0, 1, Math.PI / 2);
    }
    place(city.level >= 3 ? 'town_3' : city.level === 2 ? 'town_2' : 'town_1', -0.1, -0.15);
    const extras: string[] = [];
    if (city.job) extras.push('crates');
    if (hasBuilding(city, 'tower')) extras.push('tower');
    if (hasBuilding(city, 'market')) extras.push('market');
    if (['forge', 'iron_forge', 'steelworks'].some((b) => hasBuilding(city, b as never)))
      extras.push('blacksmith');
    if (hasBuilding(city, 'granary')) extras.push('storage');
    if (hasBuilding(city, 'lumber')) extras.push('sawmill');
    if (hasBuilding(city, 'stable')) extras.push('stable');
    if (['workshop', 'siege_workshop'].some((b) => hasBuilding(city, b as never)))
      extras.push('archery');
    if (hasBuilding(city, 'farm')) extras.push('windmill');
    const slots: [number, number][] = [
      [0.62, -0.5],
      [-0.58, 0.58],
      [0.05, 0.68],
    ];
    extras.slice(0, slots.length).forEach((name, i) => place(name, slots[i][0], slots[i][1]));
    if (hasBuilding(city, 'port')) {
      const water = this.state.tiles.find(
        (t) => t.terrain === 'water' && distance(t, tileAt(this.state, city.tile)) === 1
      );
      if (water) {
        const home = tileAt(this.state, city.tile);
        const turn = Math.atan2(water.q - home.q, water.r - home.r);
        place('port', Math.sin(turn) * 0.95, Math.cos(turn) * 0.95, 1, turn);
      }
    }
    if (city.fort > 0 && city.fort < 10) this.decor(place('ruin', 0.6, 0.05));
    return g;
  }
  private cityModel(city: City): THREE.Group {
    // Cities appear once the model library has loaded (labels show meanwhile).
    return this.models ? this.cityFromModels(city) : new THREE.Group();
  }
  private unitModel(unit: Unit) {
    const g = buildUnitModel(unit, {
      mesh: (...args) => this.mesh(...args),
      box: (...args) => this.box(...args),
      library: this.models,
      model: (...args) => this.model(...args),
      characters: this.characters,
    });
    this.mergeRigidParts(g);
    return g;
  }
  /**
   * Bakes the model's static parts that share a material into one mesh (same shape and colours, far
   * fewer draw calls). Legs, wheels and weapon pivots stay separate because actions animate them.
   */
  private vertexMaterial(remembered = false) {
    const key = remembered ? 'v2-vertex-memory' : 'v2-vertex';
    let material = this.materials.get(key);
    if (!material) {
      material = this.mat('#ffffff').clone();
      material.vertexColors = true;
      // Remembered (fogged) cities and units keep their colours, darkened like terrain memory.
      if (remembered) material.color.setScalar(0.24);
      material.onBeforeCompile = this.mat('#ffffff').onBeforeCompile;
      material.customProgramCacheKey = () => key;
      this.materials.set(key, material);
    }
    return material;
  }
  private coloredGeometry(mesh: THREE.Mesh, matrix: THREE.Matrix4) {
    const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    geo.applyMatrix4(matrix);
    const mat = mesh.material as THREE.MeshStandardMaterial,
      col = mat.color,
      colors = new Float32Array(geo.getAttribute('position').count * 3);
    const existing = geo.getAttribute('color');
    for (let i = 0; i < colors.length / 3; i++) {
      colors[i * 3] = (existing ? existing.getX(i) : 1) * col.r;
      colors[i * 3 + 1] = (existing ? existing.getY(i) : 1) * col.g;
      colors[i * 3 + 2] = (existing ? existing.getZ(i) : 1) * col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.deleteAttribute('uv');
    return geo;
  }
  private mergeRigidParts(g: THREE.Group) {
    const animated = new Set<THREE.Object3D>(
      [
        g.userData.weapon,
        // Skinned characters share library geometry and animate every bone.
        (g.userData.character as Character | undefined)?.root,
      ].filter(Boolean)
    );
    if (g.userData.weapon instanceof THREE.Group) this.mergeRigidParts(g.userData.weapon);
    g.updateMatrixWorld(true);
    const inverse = g.matrixWorld.clone().invert(),
      meshes: THREE.Mesh[] = [];
    const collect = (o: THREE.Object3D) => {
      if (animated.has(o)) return;
      if (
        o instanceof THREE.Mesh &&
        (o.material instanceof THREE.MeshStandardMaterial ||
          o.material instanceof THREE.MeshBasicMaterial) &&
        !o.material.transparent
      )
        meshes.push(o);
      for (const child of o.children) collect(child);
    };
    for (const child of g.children) collect(child);
    if (meshes.length < 2) return;
    const parts = meshes.map((m) =>
      this.coloredGeometry(m, inverse.clone().multiply(m.matrixWorld))
    );
    const merged = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    if (!merged) return;
    for (const m of meshes) {
      m.removeFromParent();
      if (!Array.isArray(m.material) && m.material.userData.transient) m.material.dispose();
      m.geometry.dispose();
      const i = this.geometries.indexOf(m.geometry);
      if (i >= 0) this.geometries.splice(i, 1);
    }
    const mesh = new THREE.Mesh(this.geometry(merged), this.vertexMaterial());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  /** Rebuild only on state/quality changes. Sources remain pickable, never drawn.
   * Geometry is made exclusively from observation/memory; batching cannot expose raw fog. */
  private batchMap() {
    this.clearGroup(this.mapBatch);
    const buckets = new Map<boolean, THREE.BufferGeometry[]>();
    this.staticGroup.updateMatrixWorld(true);
    for (const group of this.mapGroups.values()) {
      const collect = (o: THREE.Object3D) => {
        if (!o.visible) return;
        if (o instanceof THREE.Mesh) {
          const list = buckets.get(o.castShadow) ?? [];
          list.push(this.coloredGeometry(o, o.matrixWorld));
          buckets.set(o.castShadow, list);
        }
        for (const child of o.children) collect(child);
      };
      collect(group);
      group.visible = false;
    }
    for (const [shadow, parts] of buckets) {
      const geometry = mergeGeometries(parts, false);
      parts.forEach((g) => g.dispose());
      if (!geometry) continue;
      const mesh = new THREE.Mesh(this.geometry(geometry), this.vertexMaterial());
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      this.mapBatch.add(mesh);
    }
  }
  private improvementModel(parent: THREE.Group, t: Tile, p: THREE.Vector3) {
    if (t.road) {
      this.box(parent, '#b5a276', [0.4, 0.025, 0.4], [p.x, t.height + 0.02, p.z]);
      for (const n of this.state.tiles.filter(
        (n) =>
          (n.road || cityAt(this.state, n.id)) && distance(t, n) === 1 && n.terrain !== 'unknown'
      )) {
        const dq = n.q - t.q,
          dr = n.r - t.r,
          road = this.box(
            parent,
            '#b5a276',
            [0.24, 0.025, Math.hypot(dq, dr) * 0.98],
            [p.x + dq * 0.48, t.height + 0.02, p.z + dr * 0.48]
          );
        road.rotation.y = Math.atan2(dq, dr);
      }
    }
    if (t.bridge) {
      const bridge = new THREE.Group();
      bridge.position.set(p.x, 0, p.z);
      parent.add(bridge);
      const north = tileAt(this.state, `${t.q},${t.r - 1}`),
        south = tileAt(this.state, `${t.q},${t.r + 1}`);
      if (!north || !south || north.terrain === 'water' || south.terrain === 'water')
        bridge.rotation.y = Math.PI / 2;
      for (let z = -0.85; z <= 0.9; z += 0.22)
        this.box(bridge, '#987345', [1.82, 0.12, 0.16], [0, 0.12, z]);
      for (const x of [-0.6, 0.6]) this.box(bridge, '#c2aa76', [0.06, 0.5, 1.8], [x, 0.38, 0]);
    }
    if (!this.models) return;
    const place = (name: string, x = 0, z = 0, turn = 0) => {
      const m = this.model(name, parent);
      m.position.set(p.x + x, t.height, p.z + z);
      m.rotation.y = turn;
      m.userData.tile = t.id;
      return m;
    };
    if (t.improvement?.includes('farm')) {
      place('farm');
      if (t.improvement === 'irrigated_farm')
        this.box(parent, '#6bb7c3', [0.09, 0.065, 1.65], [p.x + 0.82, t.height + 0.04, p.z]);
    } else if (t.improvement === 'mine' || t.improvement === 'quarry') {
      place('mine', 0, 0, Math.PI / 6);
      if (t.improvement === 'quarry') place('stone', 0.5, 0.5);
    } else if (t.improvement === 'lumber') {
      place('logs', 0.35, 0.4);
      place('crates', -0.35, 0.35);
    } else if (t.improvement === 'pasture')
      for (const [x, z, turn] of [
        [0, -0.8, Math.PI / 2],
        [0, 0.8, Math.PI / 2],
        [-0.8, 0, 0],
        [0.8, 0, 0],
      ])
        place('fence', x, z, turn).scale.set(1, 1, 1.7);
  }
  private territories() {
    const tiles = new Map(this.state.tiles.map((t) => [t.id, t]));
    const centers = this.state.cities.map((c) => ({ c, tile: tileAt(this.state, c.tile) }));
    const ownerAt = (q: number, r: number) => {
      const t = tiles.get(`${q},${r}`);
      if (!t || t.terrain === 'water' || t.terrain === 'unknown') return null;
      const nearby = centers
        .map(({ c, tile }) => ({ c, d: distance(t, tile) }))
        .filter((x) => x.d <= 2)
        .sort((a, b) => a.d - b.d);
      return nearby[0]?.c.owner ?? null;
    };
    for (const owner of this.state.factions) {
      const points: THREE.Vector3[] = [];
      for (const t of this.state.tiles) {
        if (ownerAt(t.q, t.r) !== owner) continue;
        const p = worldPoint(t, t.height + 0.055);
        for (const [dq, dr, ax, az, bx, bz] of [
          [1, 0, 0.95, -0.95, 0.95, 0.95],
          [-1, 0, -0.95, -0.95, -0.95, 0.95],
          [0, 1, -0.95, 0.95, 0.95, 0.95],
          [0, -1, -0.95, -0.95, 0.95, -0.95],
        ]) {
          if (ownerAt(t.q + dq, t.r + dr) === owner) continue;
          points.push(
            new THREE.Vector3(p.x + ax, p.y, p.z + az),
            new THREE.Vector3(p.x + bx, p.y, p.z + bz)
          );
        }
      }
      const material = new THREE.LineDashedMaterial({
        color: FACTIONS[owner].color,
        dashSize: 0.18,
        gapSize: 0.12,
        depthTest: false,
      });
      material.userData.transient = true;
      const line = new THREE.LineSegments(
        this.geometry(new THREE.BufferGeometry().setFromPoints(points)),
        material
      );
      line.computeLineDistances();
      line.renderOrder = 3;
      this.cities.add(line);
    }
  }

  sync(
    state: State,
    selectedUnit: string | null,
    selectedTile: string | null,
    grid: boolean,
    actionTiles: string[] = []
  ) {
    this.raw = state;
    state = observe(state, 'player');
    this.state = state;
    const mapSignature = JSON.stringify([
      state.tiles,
      state.knowledge.player.visible,
      this.quality,
    ]);
    if (mapSignature !== this.batchSignature) {
      this.buildMap(state.tiles);
      this.updateMapFog(state);
      this.batchMap();
      this.batchSignature = mapSignature;
    }
    this.state = state;
    this.selectedUnit = selectedUnit;
    this.selectedTile = selectedTile;
    this.showGrid = grid;
    this.actionTiles = actionTiles;
    this.clearGroup(this.cities);
    this.labels.forEach((l) => l.el.remove());
    this.labels = [];
    for (const c of state.cities) {
      const t = tileAt(state, c.tile),
        g = this.cityModel(c);
      g.position.copy(worldPoint(t, t.height));
      g.traverse((o) => {
        o.userData.tile = c.tile;
      });
      this.cities.add(g);
      this.mergeRigidParts(g);
      const remembered = !isVisible(state, 'player', c.tile);
      if (remembered) this.shadeMemory(g);
      const el = document.createElement('button');
      el.className = `city-label ${c.owner ?? 'neutral'} ${remembered ? 'remembered' : ''} ${selectedTile === c.tile ? 'selected' : ''}`;
      el.textContent = `${c.owner ? FACTION_SYMBOL[c.owner] + ' ' : '◇ '}${c.name}${remembered ? ' · Cũ' : !c.owner ? ' · Trống' : ''}`;
      if (c.owner) el.style.borderColor = FACTIONS[c.owner].color;
      el.title = `Chọn thành ${c.name} · Công sự ${c.fort}${remembered ? ' · Thông tin lần nhìn thấy trước' : ''}`;
      el.setAttribute('aria-label', `Chọn thành ${c.name}`);
      el.onclick = (e) => {
        e.stopPropagation();
        this.onSelect(c.tile, true);
      };
      this.labelLayer.appendChild(el);
      this.labels.push({ el, pos: worldPoint(t, t.height + 1.8) });
    }
    this.territories();
    const incoming = new Set(state.units.filter((u) => !u.aboard).map((u) => u.id));
    const fresh = unseenEvents(this.raw, state, this.lastEvent);
    const newEvents = fresh.events;
    this.lastEvent = fresh.last;
    const ghosts: THREE.Group[] = [];
    for (const [id, g] of this.unitModels)
      if (!incoming.has(id)) {
        this.unitModels.delete(id);
        this.troops.remove(g);
        if (newEvents.some((e) => e.dead?.includes(id) || (e.kind === 'board' && e.actor === id))) {
          ghosts.push(g);
        } else this.clearGroup(g);
      }
    for (const u of state.units.filter((u) => !u.aboard)) {
      const tile = tileAt(state, u.tile),
        signature = u.type + u.owner;
      let g = this.unitModels.get(u.id);
      if (g && g.userData.signature !== signature) {
        this.troops.remove(g);
        this.clearGroup(g);
        this.unitModels.delete(u.id);
        g = undefined;
      }
      if (!g) {
        g = this.unitModel(u);
        g.userData.signature = signature;
        g.userData.unitId = u.id;
        this.unitModels.set(u.id, g);
        this.troops.add(g);
      }
      const target = worldPoint(
        tile,
        tile.terrain === 'water' && !tile.bridge ? -0.08 : tile.height + 0.08
      );
      if (cityAt(state, u.tile)) {
        target.x += 0.55;
        target.z += 0.65;
        g.scale.setScalar(0.9);
      } else g.scale.setScalar(1);
      g.userData.target = target;
      g.position.copy(target);
      g.traverse((o) => (o.userData.tile = u.tile));
      const label = document.createElement('button');
      label.className = `unit-marker ${u.owner} ${u.acted ? 'spent' : ''}`;
      label.innerHTML = `<span>${FACTION_SYMBOL[u.owner]} ${u.owner === 'player' ? 'BẠN' : FACTIONS[u.owner].short}${u.acted ? ' ✓' : ''} · ${u.hp}/${UNITS[u.type].hp}</span><i style="--hp:${(u.hp / UNITS[u.type].hp) * 100}%"></i>`;
      label.dataset.symbol = FACTION_SYMBOL[u.owner];
      label.dataset.kind = UNITS[u.type].name;
      label.style.setProperty('--faction-color', FACTIONS[u.owner].color);
      label.setAttribute('aria-label', `Chọn ${UNITS[u.type].name} ${u.id}`);
      label.title = `${UNITS[u.type].name} · ${u.hp} HP`;
      label.onclick = (e) => {
        e.stopPropagation();
        this.onSelect(u.tile);
      };
      this.labelLayer.appendChild(label);
      // Above the tallest headgear (plumes, riders on horseback) so the badge never hides a face.
      const lift = UNITS[u.type].class === 'cavalry' ? 2.55 : u.type in VOXEL_LOOKS ? 2.1 : 1.85;
      this.labels.push({
        el: label,
        pos: target.clone().add(new THREE.Vector3(0, lift, 0)),
        lift,
        follow: g,
      });
    }
    for (const event of newEvents)
      this.visualQueue.push({
        event,
        ghosts: ghosts.filter(
          (g) =>
            event.dead?.includes(g.userData.unitId) ||
            (event.kind === 'board' && event.actor === g.userData.unitId)
        ),
      });
    if (!this.visual) this.nextVisual();
    this.needsDraw = true;
    this.renderer.shadowMap.needsUpdate = true;
    this.updateHighlights();
  }
  private nextVisual() {
    const next = this.visualQueue.shift();
    if (next) this.startVisual(next.event, next.ghosts);
  }
  private finishVisual() {
    const v = this.visual;
    if (!v) return;
    for (const label of v.labels) label.el.remove();
    for (const g of v.ghosts) {
      this.effectGroup.remove(g);
      this.clearGroup(g);
    }
    this.clearGroup(this.effectGroup);
    for (const g of this.unitModels.values()) {
      g.position.copy(g.userData.target);
      if (g.userData.weapon) g.userData.weapon.rotation.x = 0;
      (g.userData.character as Character | undefined)?.play('idle');
    }
    this.visual = null;
    this.renderer.shadowMap.needsUpdate = true;
    this.needsDraw = true;
    if (!this.disposed) {
      this.onVisualEnd?.(v.event.id);
      this.nextVisual();
    }
  }
  private startVisual(e: ActionEvent, ghosts: THREE.Group[]) {
    for (const g of ghosts) this.effectGroup.add(g);
    const actor = this.unitModels.get(e.actor) ?? ghosts.find((g) => g.userData.unitId === e.actor),
      target = e.target
        ? (this.unitModels.get(e.target) ?? ghosts.find((g) => g.userData.tile === e.to))
        : undefined;
    const v = {
      event: e,
      time: 0,
      duration: actionSeconds({ aiSpeed: this.aiSpeed, reducedMotion: this.reduced }, e.owner),
      actorBase: actor?.position.clone(),
      targetBase: target?.position.clone(),
      ghosts,
      labels: [],
    } as NonNullable<World['visual']>;
    const float = (text: string, tile: string, color: string, start = 0.4) => {
      const t = tileAt(this.state, tile);
      if (!t) return;
      const el = document.createElement('div');
      el.className = 'combat-float';
      el.textContent = text;
      el.style.color = color;
      this.labelLayer.appendChild(el);
      v.labels.push({ el, point: worldPoint(t, t.height + 1.6), start });
    };
    if (e.kind === 'attack') {
      if (e.damage) float(`−${e.damage}`, e.to, '#ffbe9f');
      if (e.fortDamage) float(`−${e.fortDamage} tường`, e.to, '#f3dc8e');
      if (e.retaliation) float(`−${e.retaliation} phản kích`, e.from, '#ffc1ab', 0.65);
      if (!e.damage && !e.fortDamage) float('CHIẾM', e.to, '#c6e2ff');
      const d = e.actorType ? UNITS[e.actorType] : UNITS.archer;
      if (!this.reduced && d && d.range > 1) {
        v.projectile = this.mesh(
          d.class === 'siege'
            ? new THREE.IcosahedronGeometry(0.14, 0)
            : new THREE.CylinderGeometry(0.025, 0.025, 0.55, 5),
          d.class === 'siege' ? '#d5c8aa' : '#fff0c2',
          this.effectGroup
        );
        v.projectile.castShadow = false;
      }
      v.impact = this.mesh(new THREE.TorusGeometry(0.48, 0.06, 4, 12), '#ffe5a3', this.effectGroup);
      v.impact.rotation.x = -Math.PI / 2;
      v.impact.visible = false;
    } else if (['heal', 'repair', 'build'].includes(e.kind))
      float(
        e.kind === 'heal' ? `+${-e.damage} HP` : e.kind === 'repair' ? 'SỬA CHỮA' : 'XÂY DỰNG',
        e.to,
        '#bfe794'
      );
    this.visual = v;
    // A paused or hidden view never ticks, so an animation would hold the UI lock. Show the end state instead.
    if (this.paused || document.hidden) this.finishVisual();
  }
  private tickVisual(dt: number) {
    const v = this.visual;
    if (!v) return;
    v.time += dt;
    const t = Math.min(1, v.time / v.duration),
      e = v.event,
      actor = this.unitModels.get(e.actor) ?? v.ghosts.find((g) => g.userData.unitId === e.actor),
      target = e.target ? (this.unitModels.get(e.target) ?? v.ghosts[0]) : undefined;
    const from = worldPoint(tileAt(this.state, e.from), tileAt(this.state, e.from).height + 0.1),
      to = worldPoint(tileAt(this.state, e.to), tileAt(this.state, e.to).height + 0.1),
      direction = to.clone().sub(from).setY(0).normalize();
    const cue = (g: THREE.Object3D | undefined, pose: Pose) => {
      const character = g?.userData.character as Character | undefined;
      if (character && character.pose !== pose && !(character.pose === 'death'))
        character.play(pose);
    };
    const dying = (g: THREE.Object3D) => v.ghosts.includes(g as THREE.Group) && e.kind === 'attack';
    if (actor && !dying(actor))
      cue(
        actor,
        ['move', 'land', 'board'].includes(e.kind)
          ? 'walk'
          : e.kind === 'attack'
            ? t < 0.75
              ? 'attack'
              : 'idle'
            : 'work'
      );
    if (target && e.kind === 'attack' && t > 0.4)
      cue(target, dying(target) ? 'death' : e.retaliation && t > 0.65 ? 'attack' : 'hit');
    for (const g of v.ghosts)
      if (e.kind === 'attack' && t > (g.userData.unitId === e.actor ? 0.75 : 0.45)) cue(g, 'death');
    if (actor) {
      actor.rotation.y = Math.atan2(direction.x, direction.z);
      if (['move', 'land', 'board'].includes(e.kind)) {
        const path = [e.from, ...(e.path?.length ? e.path : [e.to])].map((id) => {
          const tile = tileAt(this.state, id);
          return worldPoint(
            tile,
            tile.terrain === 'water' && !tile.bridge ? -0.08 : tile.height + 0.08
          );
        });
        if (v.actorBase && e.kind !== 'board') path[path.length - 1] = v.actorBase.clone();
        const progress = t * (path.length - 1),
          i = Math.min(path.length - 2, Math.floor(progress));
        actor.position.lerpVectors(path[i], path[i + 1], progress - i);
        if (!this.reduced) {
          actor.position.y += Math.abs(Math.sin(t * Math.PI * 6)) * 0.055;
        }
      } else if (e.kind === 'attack' && v.actorBase) {
        actor.position.copy(v.actorBase);
        if (!e.damage && !e.fortDamage) actor.position.lerpVectors(from, v.actorBase, t);
        if (!this.reduced && e.actorType && UNITS[e.actorType].range === 1)
          actor.position.addScaledVector(
            direction,
            Math.sin(Math.min(1, t / 0.5) * Math.PI) * 0.45
          );
        if (actor.userData.weapon)
          actor.userData.weapon.rotation.x = this.reduced
            ? 0
            : Math.sin(Math.min(1, t / 0.5) * Math.PI) * -1.05;
      }
    }
    if (
      actor &&
      ['heal', 'repair', 'build'].includes(e.kind) &&
      actor.userData.weapon &&
      !this.reduced
    )
      actor.userData.weapon.rotation.x = -Math.sin(t * Math.PI * 3) * 0.4;
    if (v.projectile) {
      const travel = Math.min(1, t / 0.45),
        a = from.clone().add(new THREE.Vector3(0, 1, 0)),
        b = to.clone().add(new THREE.Vector3(0, 0.7, 0));
      v.projectile.position.lerpVectors(a, b, travel);
      if (e.actorType && ['catapult', 'trebuchet'].includes(e.actorType))
        v.projectile.position.y += Math.sin(travel * Math.PI) * 2;
      v.projectile.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
      v.projectile.visible = t < 0.5;
    }
    if (v.impact) {
      v.impact.visible = t > 0.4 && t < 0.8;
      v.impact.position.copy(to).add(new THREE.Vector3(0, 0.35, 0));
      v.impact.scale.setScalar(0.5 + Math.max(0, t - 0.4) * 2);
    }
    if (target && v.targetBase && e.kind === 'attack') {
      target.position.copy(v.targetBase);
      target.rotation.y = Math.atan2(-direction.x, -direction.z);
      if (t > 0.4 && !this.reduced)
        target.position.addScaledVector(
          direction,
          Math.sin(Math.min(1, (t - 0.4) / 0.25) * Math.PI) * 0.2
        );
      if (e.retaliation && t > 0.65 && !this.reduced) {
        const strike = Math.sin(Math.min(1, (t - 0.65) / 0.3) * Math.PI);
        target.position.addScaledVector(direction, -strike * 0.3);
        if (target.userData.weapon) target.userData.weapon.rotation.x = -strike;
      }
    }
    for (const g of v.ghosts) {
      const start = g.userData.unitId === e.actor ? 0.75 : 0.5;
      // Characters play their death animation instead of collapsing.
      if (e.kind === 'attack' && t > start && !g.userData.character) {
        const collapse = (t - start) / (1 - start);
        g.scale.setScalar(Math.max(0.03, 1 - collapse * 0.95));
        g.position.y -= collapse * 0.35;
        g.rotation.z = collapse * 0.4;
      }
    }
    for (const label of v.labels) {
      const progress = Math.max(0, (t - label.start) / (1 - label.start));
      const p = label.point.clone();
      p.y += progress * 0.8;
      const projected = p.project(this.camera);
      label.el.style.transform = `translate(-50%,-50%) translate(${(projected.x * 0.5 + 0.5) * this.container.clientWidth}px,${(-projected.y * 0.5 + 0.5) * this.container.clientHeight}px)`;
      label.el.style.opacity = String(
        progress < 0.2 ? progress * 5 : progress > 0.8 ? (1 - progress) / 0.2 : 1
      );
    }
    this.renderer.shadowMap.needsUpdate = true;
    if (t >= 1) this.finishVisual();
  }
  private clearGroup(group: THREE.Group) {
    group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
        // Character parts belong to the shared library.
        if (o.userData.shared) return;
        o.geometry.dispose();
        const index = this.geometries.indexOf(o.geometry);
        if (index >= 0) this.geometries.splice(index, 1);
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        materials.forEach((m) => {
          if (m.userData.transient) m.dispose();
        });
      }
    });
    group.clear();
  }
  private ring(
    tileId: string,
    color: string,
    opacity: number,
    fill = false,
    group = this.highlights
  ) {
    const t = tileAt(this.state, tileId);
    if (!t) return;
    const geometry = fill
      ? new THREE.PlaneGeometry(1.72, 1.72)
      : new THREE.RingGeometry(0.79, 0.88, 32);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      depthWrite: false,
    });
    material.userData.transient = true;
    const m = new THREE.Mesh(this.geometry(geometry), material);
    m.rotation.x = -Math.PI / 2;
    m.position.copy(worldPoint(t, t.terrain === 'water' ? -0.14 : t.height + 0.028));
    m.renderOrder = 2;
    group.add(m);
  }
  private updateHighlights() {
    this.needsDraw = true;
    this.clearGroup(this.highlights);
    if (this.showGrid)
      for (const t of this.state.tiles.filter(
        (t) => t.terrain !== 'water' && isExplored(this.state, 'player', t.id)
      ))
        this.ring(t.id, '#ffffff', 0.15);
    for (const id of this.actionTiles.filter((id) => isVisible(this.state, 'player', id))) {
      this.ring(id, '#f5c25b', 0.38, true);
      this.ring(id, '#9c7629', 0.95);
    }
    const u = this.state.units.find((u) => u.id === this.selectedUnit);
    if (
      u?.owner === 'player' &&
      this.state.turn === 'player' &&
      (!u.acted || (UNITS[u.type].mobileShot && u.moves > 0))
    ) {
      for (const [id] of reachable(this.state, u))
        if (id !== u.tile) {
          this.ring(id, '#36c5ff', 0.22, true);
          this.ring(id, '#6de4ff', 0.95);
        }
    }
    if (u?.owner === 'player' && this.state.turn === 'player' && !u.acted)
      for (const t of this.state.tiles)
        if (previewAttack(this.state, u, t.id).legal) this.ring(t.id, '#ff735a', 0.95);
    if (this.selectedTile && isExplored(this.state, 'player', this.selectedTile))
      this.ring(this.selectedTile, '#fff2a3', 1);
    this.updateHover();
  }
  /** Hover only redraws its own ring; attack/move previews are recomputed on sync, not per mouse move. */
  private updateHover() {
    this.needsDraw = true;
    this.clearGroup(this.hoverGroup);
    if (
      this.hovered &&
      isExplored(this.state, 'player', this.hovered) &&
      this.hovered !== this.selectedTile
    )
      this.ring(this.hovered, '#fff8d8', 0.8, false, this.hoverGroup);
  }
  private pick(event: PointerEvent): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.scene.updateMatrixWorld(true);
    const hit = this.raycaster
      .intersectObjects(
        [...this.troops.children, ...this.cities.children, ...this.tileMeshes],
        true
      )
      .find(
        (hit) =>
          hit.object.userData.tile && isExplored(this.state, 'player', hit.object.userData.tile)
      );
    if (hit) return hit.object.userData.tile;
    const p = this.raycaster.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      new THREE.Vector3()
    );
    if (!p) return null;
    const id = `${Math.round(p.x / 1.9)},${Math.round(p.z / 1.9)}`;
    return this.state.tiles.some((t) => t.id === id) ? id : null;
  }
  private pointerDown = (e: PointerEvent) => {
    this.tap.down(e);
    this.renderer.domElement.setPointerCapture(e.pointerId);
  };
  private pointerUp = (e: PointerEvent) => {
    if (this.tap.up(e)) {
      const id = this.pick(e);
      if (id) this.onSelect(id);
    }
  };
  private pointerCancel = () => this.tap.cancel();
  private pointerMove = (e: PointerEvent) => {
    this.tap.move(e);
    const id = this.pick(e);
    if (id !== this.hovered) {
      this.hovered = id;
      this.onHover(id);
      this.updateHover();
    }
  };
  private pointerLeave = () => {
    this.hovered = null;
    this.onHover(null);
    this.updateHover();
  };
  private contextMenu = (e: Event) => e.preventDefault();
  private keyDown = (e: KeyboardEvent) => {
    if (this.paused) return;
    if ((e.target as HTMLElement).closest('input, textarea, select, [role=dialog]')) return;
    if (e.key.toLowerCase() === 'q') this.rotate(-Math.PI / 2);
    if (e.key.toLowerCase() === 'e') this.rotate(Math.PI / 2);
  };
  rotate(angle: number) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }
  zoom(amount: number) {
    this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * amount, 0.3, MAX_ZOOM);
    this.camera.updateProjectionMatrix();
    this.needsDraw = true;
  }
  resetCamera() {
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(12, 19, 16);
    this.camera.zoom = DEFAULT_ZOOM;
    const own =
      this.state.units.find((u) => u.owner === 'player')?.tile ??
      this.state.cities.find((c) => c.owner === 'player')?.tile;
    if (own) this.focus(own);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }
  setDanger(current: string[], potential: string[]) {
    this.clearGroup(this.dangerGroup);
    for (const id of potential) this.ring(id, '#e7ad63', 0.2, true, this.dangerGroup);
    for (const id of current) this.ring(id, '#ef5555', 0.3, true, this.dangerGroup);
    this.needsDraw = true;
  }
  setPreviewPath(path: string[]) {
    this.clearGroup(this.pathGroup);
    for (const id of path)
      if (isVisible(this.state, 'player', id)) this.ring(id, '#ffe58c', 0.65, true, this.pathGroup);
    this.needsDraw = true;
  }
  focus(tileId: string) {
    const t = tileAt(this.state, tileId);
    if (!t) return;
    const target = worldPoint(t);
    const delta = target.clone().sub(this.controls.target);
    this.camera.position.add(delta);
    this.controls.target.copy(target);
    this.controls.update();
  }
  setPaused(value: boolean) {
    const changed = value && !this.paused;
    this.paused = value;
    if (changed) this.finishVisual();
    this.needsDraw = true;
  }
  /** Applies presentation settings in place: camera, selection, units and fog are untouched. */
  setVisualSettings(settings: WorldVisualSettings) {
    if (settings.aiSpeed) this.aiSpeed = settings.aiSpeed;
    if (settings.reducedMotion !== undefined) this.reduced = settings.reducedMotion;
    if (this.visual)
      this.visual.duration = Math.min(
        this.visual.duration,
        actionSeconds(
          { aiSpeed: this.aiSpeed, reducedMotion: this.reduced },
          this.visual.event.owner
        )
      );
    if (settings.quality && settings.quality !== this.quality) {
      this.quality = settings.quality;
      const normal = this.quality === 'normal';
      this.renderer.setPixelRatio(this.pixelRatio());
      this.renderer.shadowMap.enabled = normal;
      this.sun.castShadow = normal;
      this.renderer.shadowMap.needsUpdate = true;
      // Shadow support is compiled into each program, so shared materials must recompile once.
      this.scene.traverse((o) => {
        if (o.userData.decor) o.visible = this.quality !== 'low';
        if (o instanceof THREE.Mesh)
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(
            (m) => (m.needsUpdate = true)
          );
      });
      this.updateMapFog(this.state);
      this.batchMap();
      this.resize();
      // Soldiers switch between fine and basic voxel models.
      for (const g of this.unitModels.values()) {
        this.troops.remove(g);
        this.clearGroup(g);
      }
      this.unitModels.clear();
      if (this.raw)
        this.sync(this.raw, this.selectedUnit, this.selectedTile, this.showGrid, this.actionTiles);
    }
    this.needsDraw = true;
  }
  visualSettings() {
    return {
      quality: this.quality,
      aiSpeed: this.aiSpeed,
      reducedMotion: this.reduced,
      pixelRatio: this.renderer.getPixelRatio(),
      shadows: this.renderer.shadowMap.enabled,
    };
  }
  isAnimating() {
    return !!this.visual;
  }
  diagnostics() {
    const memory = this.renderer.info.memory;
    return {
      renderedFrames: this.renderedFrames,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      units: this.unitModels.size,
      effectObjects: this.effectGroup.children.length,
      geometries: memory.geometries,
      textures: memory.textures,
      programs: this.renderer.info.programs?.length ?? 0,
      labels: this.labels.length,
      trackedGeometries: this.geometries.length,
      materials: this.materials.size,
    };
  }
  private resize() {
    this.needsDraw = true;
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    if (!w || !h) return;
    const half = 7.8;
    this.camera.left = (-half * w) / h;
    this.camera.right = (half * w) / h;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
  /** Soldiers breathe and shift while idle only at full quality (it redraws every frame). */
  private idleMotion() {
    return (
      this.quality === 'normal' && !this.reduced && !!this.characters && this.unitModels.size > 0
    );
  }
  private animate = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    if (document.hidden || this.paused) return;
    this.controls.update();
    this.renderTime += delta;
    if (this.renderTime < FRAME_BUDGET) return;
    const idle = this.idleMotion();
    if (!this.needsDraw && !this.visual && !idle) {
      this.renderTime = 0;
      return;
    }
    const dt = Math.min(this.renderTime, 0.08);
    this.renderTime = 0;
    this.tickVisual(dt);
    if (this.visual || idle) {
      for (const g of [...this.unitModels.values(), ...(this.visual?.ghosts ?? [])])
        (g.userData.character as Character | undefined)?.update(dt);
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.controls.target.x = THREE.MathUtils.clamp(this.controls.target.x, -31, 31);
    this.controls.target.z = THREE.MathUtils.clamp(this.controls.target.z, -23, 23);
    this.controls.update();

    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    this.labelLayer.classList.toggle('strategic', this.camera.zoom < 0.65);
    for (const label of this.labels) {
      const v = (
        label.follow
          ? label.follow.position.clone().add(new THREE.Vector3(0, label.lift ?? 1.85, 0))
          : label.pos.clone()
      ).project(this.camera);
      label.el.style.transform = `translate(-50%,-50%) translate(${(v.x * 0.5 + 0.5) * w}px,${(-v.y * 0.5 + 0.5) * h}px)`;
      label.el.style.visibility = Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1 ? 'hidden' : 'visible';
    }
    this.renderer.render(this.scene, this.camera);
    this.renderedFrames++;
    this.needsDraw = false;
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.dispose();
    window.removeEventListener('keydown', this.keyDown);
    this.renderer.domElement.removeEventListener('pointerdown', this.pointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.pointerUp);
    this.renderer.domElement.removeEventListener('pointercancel', this.pointerCancel);
    this.renderer.domElement.removeEventListener('pointermove', this.pointerMove);
    this.renderer.domElement.removeEventListener('pointerleave', this.pointerLeave);
    this.renderer.domElement.removeEventListener('contextmenu', this.contextMenu);
    for (const item of this.visualQueue) for (const g of item.ghosts) this.clearGroup(g);
    this.visualQueue = [];
    this.finishVisual();
    this.clearGroup(this.dangerGroup);
    this.clearGroup(this.pathGroup);
    this.clearGroup(this.mapBatch);
    this.clearGroup(this.cities);
    this.clearGroup(this.troops);
    this.clearGroup(this.highlights);
    this.clearGroup(this.hoverGroup);
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.fogTexture.dispose();
    this.renderer.forceContextLoss();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelLayer.remove();
  }
}
