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
import { buildUnitModel } from './unitModels';
import { FACTION_SYMBOL } from './visualIdentity';

export function worldPoint(tile: { q: number; r: number }, y = 0) {
  return new THREE.Vector3(tile.q * 1.9, y, tile.r * 1.9);
}
const COLORS = {
  grass: ['#71984e', '#749b50', '#6e954d'],
  forest: ['#608745', '#658a47'],
  hill: ['#b2ae80', '#a9a57a'],
  mountain: ['#8c998c'],
  sand: ['#d3c39a', '#dfcea5'],
  water: ['#4a8c9b'],
  unknown: ['#050608'],
};
const pickColor = (t: Tile) =>
  COLORS[t.terrain][Math.abs(t.q * 7 + t.r * 3) % COLORS[t.terrain].length];

// 30 FPS cap. Two 60 Hz vsync ticks sum to ~33.3 ms with jitter on either side of 1/30 s; without the
// tolerance about half of the frames slip to a third tick and motion runs near 20 FPS.
const FRAME_BUDGET = 1 / 30 - 0.004;

/** Presentation settings only; none of these change State, fog or rules. */
export type WorldVisualSettings = {
  quality?: GraphicsQuality;
  aiSpeed?: AISpeed;
  reducedMotion?: boolean;
};
export type WorldOptions = WorldVisualSettings & { onVisualEnd?: (eventId: number) => void };

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
  private labelLayer: HTMLDivElement;
  private labels: { el: HTMLButtonElement; pos: THREE.Vector3; follow?: THREE.Group }[] = [];
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
    this.scene.background = new THREE.Color('#050608');
    this.scene.fog = new THREE.Fog('#050608', 65, 115);
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
    this.controls.maxZoom = 1.9;
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
    const ambient = new THREE.HemisphereLight('#fff8de', '#679a9f', 2.1);
    this.scene.add(ambient);
    const sun = new THREE.DirectionalLight('#fff1cd', 2.6);
    sun.position.set(-12, 24, 12);
    sun.castShadow = this.quality === 'normal';
    this.sun = sun;
    sun.shadow.mapSize.set(1024, 1024);
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
          gl_FragColor.rgb=mix(vec3(0.0196,0.0235,0.0314),gl_FragColor.rgb,edgeVisibility);
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
      const tile = this.mesh(
        new THREE.BoxGeometry(1.9, depth, 1.9),
        pickColor(t),
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
      if (t.terrain === 'forest') {
        for (const [index, [dx, dz, scale]] of [
          [-0.28, -0.15, 1],
          [0.31, 0.2, 0.8],
          [0.08, -0.4, 0.65],
        ].entries()) {
          const g = new THREE.Group();
          g.position.set(p.x + dx, t.height, p.z + dz);
          g.scale.setScalar(scale);
          parent.add(g);
          // Low quality keeps one full tree per forest tile so the terrain still reads as forest.
          if (index > 0) this.decor(g);
          this.mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.45, 5), '#70674b', g, 0, 0.2);
          this.mesh(new THREE.ConeGeometry(0.37, 0.77, 6), '#426d55', g, 0, 0.68);
          this.mesh(new THREE.ConeGeometry(0.28, 0.62, 6), '#557d5c', g, 0, 1.05);
        }
      } else if (t.terrain === 'mountain') {
        this.mesh(
          new THREE.ConeGeometry(0.7, 1.4, 5),
          '#879387',
          parent,
          p.x,
          t.height + 0.63,
          p.z
        );
        this.decor(
          this.mesh(
            new THREE.ConeGeometry(0.27, 0.45, 5),
            '#dedbc3',
            parent,
            p.x,
            t.height + 1.15,
            p.z
          )
        );
      } else if ((t.q * 5 + t.r * 3) % 7 === 0) {
        const rock = this.mesh(
          new THREE.DodecahedronGeometry(0.19, 0),
          '#a4aa8d',
          parent,
          p.x + 0.32,
          t.height + 0.1,
          p.z - 0.3
        );
        rock.scale.y = 0.7;
        this.decor(rock);
      }
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
        o.material = this.mat(base.color.clone().multiplyScalar(0.24).getStyle());
        o.castShadow = false;
      }
    });
  }
  private flag(parent: THREE.Object3D, color: string, x: number, y: number, z: number, scale = 1) {
    this.mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.9 * scale, 5),
      '#6c6150',
      parent,
      x,
      y + 0.45 * scale,
      z
    );
    this.box(
      parent,
      color,
      [0.43 * scale, 0.25 * scale, 0.028],
      [x + 0.2 * scale, y + 0.73 * scale, z]
    );
  }
  private cityModel(city: City): THREE.Group {
    const g = new THREE.Group();
    const color = city.owner ? FACTIONS[city.owner].color : '#d5bd83';
    if (!city.owner) {
      this.box(g, '#9d7549', [0.7, 0.65, 0.65], [0, 0.33, 0]);
      this.mesh(new THREE.ConeGeometry(0.68, 0.65, 4), '#c9b57c', g, 0, 0.94, 0).rotation.y =
        Math.PI / 4;
      this.box(g, '#544631', [0.2, 0.32, 0.03], [0, 0.17, 0.34]);
      return g;
    }
    const stone = city.level > 1 ? '#e0d9bc' : '#b6b6a0';
    const wall = city.fort > 0 ? stone : '#92937e';
    const h = city.level === 3 ? 0.85 : city.level > 1 ? 0.6 : 0.38;
    this.mesh(new THREE.CylinderGeometry(0.83, 0.91, 0.13, 6), '#b7aa85', g, 0, 0.04);
    for (const x of [-0.59, 0.59])
      for (const z of [-0.46, 0.46]) {
        this.box(g, wall, [0.26, h + 0.18, 0.26], [x, (h + 0.18) / 2 + 0.08, z]);
        this.mesh(new THREE.ConeGeometry(0.23, 0.27, 4), color, g, x, h + 0.35, z).rotation.y =
          Math.PI / 4;
      }
    if (city.fort > 0) {
      for (const x of [-0.59, 0.59]) this.box(g, wall, [0.13, h, 0.86], [x, h / 2 + 0.06, 0]);
      this.box(g, wall, [1.1, h, 0.13], [0, h / 2 + 0.06, -0.46]);
      for (const x of [-0.4, 0.4]) this.box(g, wall, [0.36, h, 0.13], [x, h / 2 + 0.06, 0.46]);
      for (let x = -0.4; x <= 0.41; x += 0.2)
        this.box(g, wall, [0.09, 0.11, 0.16], [x, h + 0.12, -0.46]);
    }
    this.box(
      g,
      '#e6d8b7',
      [0.43 + city.level * 0.07, 0.4 + city.level * 0.22, 0.48],
      [0, 0.27 + city.level * 0.11, -0.06]
    );
    this.mesh(
      new THREE.ConeGeometry(0.41, 0.38, 4),
      color,
      g,
      0,
      0.65 + city.level * 0.26,
      -0.06
    ).rotation.y = Math.PI / 4;
    this.box(g, '#665b48', [0.12, 0.21, 0.02], [0, 0.2, 0.19]);
    this.flag(g, color, 0.18, 0.88, -0.12, 0.7);
    if (hasBuilding(city, 'farm'))
      for (let i = 0; i < 4; i++)
        this.box(
          g,
          i % 2 ? '#b5a25a' : '#8c854c',
          [0.09, 0.06, 0.46],
          [-0.35 + i * 0.11, 0.12, 0.91]
        );
    if (hasBuilding(city, 'market')) {
      this.box(g, '#78694d', [0.5, 0.2, 0.3], [0.8, 0.16, 0.2]);
      this.box(g, '#c79d70', [0.55, 0.06, 0.4], [0.8, 0.42, 0.2]);
    }
    if (hasBuilding(city, 'lumber'))
      for (let i = 0; i < 3; i++) {
        const log = this.mesh(
          new THREE.CylinderGeometry(0.07, 0.07, 0.6, 6),
          '#90724e',
          g,
          0.83,
          0.13 + i * 0.1,
          0.1
        );
        log.rotation.z = Math.PI / 2;
      }
    if (hasBuilding(city, 'stable')) {
      this.box(g, '#815f3f', [0.45, 0.35, 0.5], [0.9, 0.18, -0.45]);
      this.box(g, color, [0.55, 0.08, 0.6], [0.9, 0.4, -0.45]);
    }
    if (hasBuilding(city, 'forge')) {
      this.box(g, '#5d665e', [0.35, 0.4, 0.35], [-0.8, 0.2, -0.55]);
      this.box(g, '#edaa51', [0.15, 0.15, 0.03], [-0.8, 0.16, -0.36]);
    }
    if (hasBuilding(city, 'wall') && city.fort > 0)
      for (const x of [-0.5, -0.25, 0, 0.25, 0.5])
        this.box(g, '#a0a995', [0.14, 0.15, 0.18], [x, h + 0.2, 0.46]);
    if (city.fort === 0)
      for (const x of [-0.6, 0.6]) this.box(g, '#777c6d', [0.3, 0.12, 0.5], [x, 0.12, 0.4]);
    if (hasBuilding(city, 'tower')) {
      this.box(g, '#a5af9d', [0.28, 1, 0.28], [-0.65, 0.5, -0.65]);
      this.box(g, color, [0.38, 0.1, 0.38], [-0.65, 1.03, -0.65]);
    }
    if (hasBuilding(city, 'port')) {
      const water = this.state.tiles.find(
        (t) => t.terrain === 'water' && distance(t, tileAt(this.state, city.tile)) === 1
      );
      if (water) {
        const dock = new THREE.Group(),
          home = tileAt(this.state, city.tile);
        dock.rotation.y = Math.atan2(water.q - home.q, water.r - home.r);
        g.add(dock);
        for (let i = 0; i < 5; i++)
          this.box(dock, '#a7895e', [0.6, 0.08, 0.15], [-0.55, 0.03, 0.75 + i * 0.2]);
      }
    }
    if (hasBuilding(city, 'granary')) {
      this.mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.5, 8), '#d6c495', g, 0.9, 0.25, 0.7);
      this.mesh(new THREE.ConeGeometry(0.25, 0.2, 6), color, g, 0.9, 0.6, 0.7);
    }
    if (hasBuilding(city, 'workshop')) {
      this.box(g, '#97734b', [0.5, 0.3, 0.3], [-0.9, 0.15, 0.5]);
      this.mesh(new THREE.TorusGeometry(0.17, 0.05, 5, 8), '#c2c4ad', g, -0.9, 0.45, 0.5);
    }
    if (hasBuilding(city, 'siege_workshop')) {
      this.box(g, '#715735', [0.65, 0.25, 0.4], [0, 0.15, -0.9]);
      const beam = this.box(g, '#bea372', [0.08, 0.85, 0.08], [0, 0.65, -0.9]);
      beam.rotation.x = 0.4;
    }
    if (hasBuilding(city, 'iron_forge'))
      this.box(g, '#555e63', [0.18, 0.7, 0.18], [-0.9, 0.6, -0.6]);
    if (hasBuilding(city, 'steelworks'))
      for (const x of [-1, -0.75]) this.box(g, '#bdc3c2', [0.12, 0.95, 0.12], [x, 0.65, -0.6]);
    if (hasBuilding(city, 'shipyard')) {
      for (const x of [0.7, 1.1]) this.box(g, '#b99a64', [0.08, 0.85, 0.08], [x, 0.42, 0.8]);
      this.box(g, '#b99a64', [0.55, 0.08, 0.08], [0.9, 0.9, 0.8]);
    }
    if (city.fort > 0 && city.fort < 10)
      for (const x of [-0.45, 0, 0.45]) this.box(g, '#494d46', [0.08, 0.25, 0.015], [x, 0.3, 0.54]);
    if (city.job) {
      for (const x of [-0.8, 0.8]) this.box(g, '#87734e', [0.04, 0.9, 0.04], [x, 0.45, 0.6]);
      this.box(g, '#a18c61', [1.65, 0.045, 0.045], [0, 0.65, 0.6]);
    }
    return g;
  }
  private unitModel(unit: Unit) {
    const g = buildUnitModel(unit, {
      mesh: (...args) => this.mesh(...args),
      box: (...args) => this.box(...args),
    });
    this.mergeRigidParts(g);
    return g;
  }
  /**
   * Bakes the model's static parts that share a material into one mesh (same shape and colours, far
   * fewer draw calls). Legs, wheels and weapon pivots stay separate because actions animate them.
   */
  private vertexMaterial() {
    const key = 'v2-vertex';
    let material = this.materials.get(key);
    if (!material) {
      material = this.mat('#ffffff').clone();
      material.vertexColors = true;
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
        ...(g.userData.legs ?? []),
        ...(g.userData.wheels ?? []),
        g.userData.weapon,
        g.userData.sail,
      ].filter(Boolean)
    );
    for (const o of animated) if (o instanceof THREE.Group) this.mergeRigidParts(o);
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
    if (t.improvement?.includes('farm') || t.improvement === 'pasture')
      for (let i = 0; i < 4; i++)
        this.box(
          parent,
          t.improvement === 'pasture' ? '#a3b777' : '#cab05f',
          [1.35, 0.05, 0.1],
          [p.x, t.height + 0.04, p.z - 0.5 + i * 0.32]
        );
    if (t.improvement === 'irrigated_farm')
      this.box(parent, '#6bb7c3', [0.09, 0.065, 1.65], [p.x + 0.65, t.height + 0.04, p.z]);
    if (['mine', 'quarry'].includes(t.improvement ?? '')) {
      this.box(parent, '#555e55', [0.65, 0.12, 0.65], [p.x, t.height + 0.03, p.z]);
      this.box(parent, '#ad9a6e', [0.1, 0.6, 0.1], [p.x - 0.3, t.height + 0.3, p.z]);
      this.box(parent, '#ad9a6e', [0.8, 0.1, 0.1], [p.x, t.height + 0.58, p.z]);
    }
    if (t.improvement === 'lumber')
      for (let i = 0; i < 3; i++)
        this.box(
          parent,
          '#c09a63',
          [0.45, 0.1, 0.12],
          [p.x + 0.5, t.height + 0.12 + i * 0.1, p.z + 0.5]
        );
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
    const newEvents = (state.events ?? (state.event ? [state.event] : [])).filter(
      (e) => e.id > (this.lastEvent ?? 0)
    );
    this.lastEvent = state.serial;
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
      this.labels.push({
        el: label,
        pos: target.clone().add(new THREE.Vector3(0, 1.85, 0)),
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
      for (const leg of g.userData.legs ?? []) leg.rotation.x = 0;
      if (g.userData.weapon) g.userData.weapon.rotation.x = 0;
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
          for (const [index, leg] of (actor.userData.legs ?? []).entries())
            leg.rotation.x = Math.sin(t * Math.PI * 8 + index * Math.PI) * 0.35;
          for (const w of actor.userData.wheels ?? []) w.rotation.x = t * Math.PI * 4;
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
      if (e.kind === 'attack' && t > start) {
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
    this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * amount, 0.3, 1.9);
    this.camera.updateProjectionMatrix();
    this.needsDraw = true;
  }
  resetCamera() {
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(12, 19, 16);
    this.camera.zoom = 1;
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
  private animate = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    if (document.hidden || this.paused) return;
    this.controls.update();
    this.renderTime += delta;
    if (this.renderTime < FRAME_BUDGET) return;
    if (!this.needsDraw && !this.visual) {
      this.renderTime = 0;
      return;
    }
    const dt = Math.min(this.renderTime, 0.08);
    this.renderTime = 0;
    this.tickVisual(dt);
    this.controls.target.x = THREE.MathUtils.clamp(this.controls.target.x, -31, 31);
    this.controls.target.z = THREE.MathUtils.clamp(this.controls.target.z, -23, 23);
    this.controls.update();

    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    this.labelLayer.classList.toggle('strategic', this.camera.zoom < 0.65);
    for (const label of this.labels) {
      const v = (
        label.follow
          ? label.follow.position.clone().add(new THREE.Vector3(0, 1.85, 0))
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
