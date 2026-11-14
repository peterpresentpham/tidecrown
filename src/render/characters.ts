/**
 * Skinned, animated soldiers built from the Quaternius parts packed by scripts/models/characters.ts:
 * an outfit body, a base head and hair re-bound to the outfit skeleton, gear on the hand bones,
 * an optional horse, and the Universal Animation Library clips.
 *
 * Geometry and textures are shared with the library (meshes are marked `userData.shared`).
 */
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

import type { UnitType } from '../game/engine';

export type Pose = 'idle' | 'walk' | 'attack' | 'hit' | 'death' | 'work';
/** A loaded glTF file (scene + clips); the loader is the caller's business. */
export type Asset = { scene: THREE.Object3D; animations: THREE.AnimationClip[] };

type Gear = {
  file: string;
  hand: 'r' | 'l';
  kind: 'held' | 'bow' | 'shield';
  /** Longest side in metres, before the character is scaled. */
  length: number;
  /** Fraction of the length, from the bottom, where the fist holds it. */
  grip?: number;
  /** Tilt above horizontal in degrees (held weapons). */
  tilt?: number;
};
type Look = {
  outfit: 'Male_Ranger' | 'Female_Ranger' | 'Male_Peasant' | 'Female_Peasant';
  hair?: string[];
  helmet?: 'Helmet1' | 'Helmet2' | 'Helmet3';
  pads?: boolean;
  gear: Gear[];
  mount?: 'Horse' | 'Horse_White';
  clips?: Partial<Record<Pose, string>>;
};

const held = (file: string, length: number, grip = 0.1, tilt = 25): Gear => ({
  file,
  hand: 'r',
  kind: 'held',
  length,
  grip,
  tilt,
});
const shield = (file: string, length = 0.55): Gear => ({ file, hand: 'l', kind: 'shield', length });
const BOW: Gear = { file: 'Bow_Wooden', hand: 'l', kind: 'bow', length: 1.15 };
const SHOOT = { attack: 'Pistol_Shoot' };

/** Every land unit; siege engines and ships stay baked models (unitModels.ts). */
export const LOOKS: Partial<Record<UnitType, Look>> = {
  clubman: {
    outfit: 'Male_Peasant',
    hair: ['Hair_SimpleParted', 'Hair_Beard'],
    gear: [held('Hammer_Small', 0.7, 0.12)],
  },
  scout: {
    outfit: 'Female_Ranger',
    gear: [held('Dagger', 0.45, 0.2)],
    clips: { walk: 'Jog_Fwd_Loop' },
  },
  shield: {
    outfit: 'Male_Peasant',
    hair: ['Hair_Buzzed'],
    helmet: 'Helmet2',
    gear: [held('Sword', 0.9), shield('Shield_Heater', 0.65)],
  },
  spear: {
    outfit: 'Female_Peasant',
    hair: ['Hair_Buns'],
    gear: [held('Spear', 1.9, 0.35, 10), shield('Shield_Round')],
  },
  pikeman: {
    outfit: 'Male_Peasant',
    helmet: 'Helmet1',
    gear: [held('Spear', 2.5, 0.3, 60)],
  },
  swordsman: {
    outfit: 'Male_Ranger',
    hair: ['Hair_Buzzed'],
    gear: [held('Sword_2', 0.95), shield('Shield_Round_2')],
  },
  heavy_infantry: {
    outfit: 'Male_Peasant',
    helmet: 'Helmet3',
    pads: true,
    gear: [held('Claymore', 1.25, 0.12, 35)],
  },
  archer: { outfit: 'Female_Ranger', gear: [BOW], clips: SHOOT },
  ranger: { outfit: 'Male_Ranger', gear: [BOW], clips: SHOOT },
  crossbow: {
    outfit: 'Male_Peasant',
    helmet: 'Helmet1',
    gear: [{ ...BOW, file: 'Bow_Wooden2' }],
    clips: SHOOT,
  },
  engineer: {
    outfit: 'Male_Peasant',
    hair: ['Hair_Long', 'Hair_Beard'],
    gear: [held('Hammer_Double', 0.8, 0.12)],
  },
  light_cavalry: { outfit: 'Male_Ranger', mount: 'Horse', gear: [held('Axe', 0.75, 0.12)] },
  horse_archer: { outfit: 'Female_Ranger', mount: 'Horse', gear: [BOW], clips: SHOOT },
  knight: {
    outfit: 'Male_Peasant',
    helmet: 'Helmet1',
    mount: 'Horse',
    gear: [held('Spear', 2, 0.3, 5), shield('Shield_Heater', 0.5)],
  },
  heavy_knight: {
    outfit: 'Male_Peasant',
    helmet: 'Helmet3',
    pads: true,
    mount: 'Horse_White',
    gear: [held('Spear', 2.1, 0.3, 5), shield('Shield_Heater_2', 0.5)],
  },
  paladin: {
    outfit: 'Male_Ranger',
    helmet: 'Helmet2',
    pads: true,
    mount: 'Horse_White',
    gear: [held('Sword_Golden', 1), shield('Shield_Celtic_Golden', 0.5)],
    clips: { work: 'Spell_Simple_Shoot' },
  },
};

const HUMAN: Record<Pose, string> = {
  idle: 'Idle_Loop',
  walk: 'Walk_Loop',
  attack: 'Sword_Attack',
  hit: 'Hit_Chest',
  death: 'Death01',
  work: 'Fixing_Kneeling',
};
/** Riders sit through everything but death; the horse carries the motion. */
const RIDER: Partial<Record<Pose, string>> = {
  idle: 'Sitting_Idle_Loop',
  walk: 'Sitting_Idle_Loop',
  attack: 'Sitting_Idle_Loop',
  hit: 'Sitting_Idle_Loop',
  work: 'Sitting_Idle_Loop',
};
const HORSE: Record<Pose, string> = {
  idle: 'AnimalArmature|Idle',
  walk: 'AnimalArmature|Walk',
  attack: 'AnimalArmature|Gallop',
  hit: 'AnimalArmature|Idle_HitReact_Left',
  death: 'AnimalArmature|Death',
  work: 'AnimalArmature|Idle',
};
const LOOPING: Pose[] = ['idle', 'walk', 'work'];
/** Game scale: a soldier stands a little under one tile (1.9) tall. */
export const HUMAN_HEIGHT = 1.5;
const HORSE_LENGTH = 1.75;

/** Faction colour on the outfit cloth: texture alpha < 1 marks it (see characters.ts packer). */
function tinted(material: THREE.MeshStandardMaterial, team: string) {
  const m = material.clone();
  const color = new THREE.Color(team);
  m.onBeforeCompile = (shader) => {
    shader.uniforms.nationTeam = { value: color };
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec3 nationTeam;\nvoid main() {')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        if (diffuseColor.a < 0.995) diffuseColor.rgb = nationTeam * diffuseColor.a * 1.99;
        diffuseColor.a = 1.0;`
      );
  };
  m.customProgramCacheKey = () => 'nation-team';
  return m;
}

export class Character {
  readonly root = new THREE.Group();
  pose: Pose = 'idle';
  /** One mixer per skeleton (rider, horse), each with its clip per pose. */
  readonly mixers: {
    mixer: THREE.AnimationMixer;
    clips: Partial<Record<Pose, THREE.AnimationClip>>;
    active?: THREE.AnimationAction;
  }[] = [];

  play(pose: Pose, fade = 0.15) {
    this.pose = pose;
    const loop = LOOPING.includes(pose);
    for (const entry of this.mixers) {
      const clip = entry.clips[pose] ?? entry.clips.idle;
      if (!clip) continue;
      const next = entry.mixer.clipAction(clip);
      // A looping pose already playing keeps its phase (riders sit through most poses).
      if (entry.active === next && loop && next.isRunning()) continue;
      next.reset();
      next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      next.clampWhenFinished = !loop;
      next.play();
      if (entry.active && entry.active !== next) {
        if (fade > 0) entry.active.crossFadeTo(next, fade, false);
        else entry.active.stop();
      }
      entry.active = next;
    }
  }

  update(dt: number) {
    for (const { mixer } of this.mixers) mixer.update(dt);
  }
}

export class CharacterLibrary {
  private materials = new Map<string, THREE.Material>();

  constructor(private assets: Record<string, Asset>) {}

  has(type: UnitType) {
    const look = LOOKS[type];
    return !!look && !!this.assets[look.outfit] && !!this.assets.Animations;
  }

  build(type: UnitType, team: string): Character {
    const look = LOOKS[type]!;
    const character = new Character();
    const body = this.human(look, team);
    const humanClips = Object.fromEntries(
      (Object.keys(HUMAN) as Pose[]).map((pose) => [
        pose,
        this.clip(
          'Animations',
          (look.mount ? RIDER[pose] : undefined) ?? look.clips?.[pose] ?? HUMAN[pose]
        ),
      ])
    );
    const rider = { mixer: new THREE.AnimationMixer(body.outfit), clips: humanClips };
    character.mixers.push(rider);
    // Fit gear over the idle pose (the one seen most), then hand it to the bones.
    rider.mixer.clipAction(humanClips.idle!).play();
    rider.mixer.update(0.25);
    body.outfit.updateMatrixWorld(true);
    for (const gear of look.gear) {
      const hand = body.bones.get(`hand_${gear.hand}`),
        elbow = body.bones.get(`lowerarm_${gear.hand}`);
      if (hand && elbow) this.arm(gear, hand, elbow, body.outfit, team);
    }
    const head = body.bones.get('Head'),
      chest = body.bones.get('spine_03');
    if (look.helmet && head) this.wear(look.helmet, head, body.outfit, 0.3, 0.1);
    if (look.pads && chest) this.wear('ShoulderPads', chest, body.outfit, 0.52, 0.14);
    rider.mixer.stopAllAction();
    fit(body.outfit, HUMAN_HEIGHT);
    if (look.mount) {
      const asset = this.assets[look.mount];
      const horse = SkeletonUtils.clone(asset.scene);
      share(horse);
      fit(horse, HORSE_LENGTH, 'z');
      character.root.add(horse);
      character.mixers.push({
        mixer: new THREE.AnimationMixer(horse),
        clips: Object.fromEntries(
          (Object.keys(HORSE) as Pose[]).map((pose) => [pose, this.clip(look.mount!, HORSE[pose])])
        ),
      });
      // Saddle cloth in the faction colour; the rider sits just behind the withers.
      const saddle = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.05, 0.42),
        new THREE.MeshStandardMaterial({ color: team, roughness: 0.8 })
      );
      saddle.position.set(0, 0.9, -0.05);
      saddle.castShadow = true;
      character.root.add(saddle);
      body.outfit.position.set(0, 0.5, -0.1);
    }
    character.root.add(body.outfit);
    character.play('idle', 0);
    character.update(Math.random() * 2);
    return character;
  }

  private clip(asset: string, name: string) {
    const clips = this.assets[asset]?.animations ?? [];
    const clip = clips.find((c) => c.name === name) ?? clips[0];
    if (!clip) return undefined;
    // Root motion would walk the body off its tile; the world moves units between tiles.
    const inPlace = clip.clone();
    inPlace.tracks = inPlace.tracks.filter((t) => !/^root\.position/.test(t.name));
    return inPlace;
  }

  private material(source: THREE.Material, team: string) {
    const outfit = /MI_(Ranger|Peasant)/.test(source.name);
    if (!outfit) return source;
    const key = source.uuid + team;
    let material = this.materials.get(key);
    if (!material) {
      material = tinted(source as THREE.MeshStandardMaterial, team);
      this.materials.set(key, material);
    }
    return material;
  }

  /** Outfit with a base head (and hair) re-bound to the outfit's skeleton. */
  private human(look: Look, team: string) {
    const outfit = SkeletonUtils.clone(this.assets[look.outfit].scene);
    share(outfit);
    let skeleton: THREE.Skeleton | undefined;
    outfit.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      skeleton ??= mesh.skeleton;
      mesh.material = this.material(mesh.material as THREE.Material, team);
    });
    const bones = new Map(skeleton!.bones.map((b) => [b.name, b]));
    const parent = skeleton!.bones[0].parent ?? outfit;
    const attach = (asset: Asset) => {
      const scene = SkeletonUtils.clone(asset.scene);
      share(scene);
      const meshes: THREE.SkinnedMesh[] = [];
      scene.traverse((o) => {
        if ((o as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(o as THREE.SkinnedMesh);
      });
      for (const mesh of meshes) {
        const rebound = new THREE.Skeleton(
          mesh.skeleton.bones.map((b) => bones.get(b.name) ?? b),
          mesh.skeleton.boneInverses
        );
        parent.add(mesh);
        mesh.bind(rebound, mesh.bindMatrix);
      }
    };
    const female = look.outfit.startsWith('Female');
    attach(this.assets[female ? 'Head_Female' : 'Head_Male']);
    for (const hair of look.hair ?? []) if (this.assets[hair]) attach(this.assets[hair]);
    return { outfit, bones };
  }

  /** Places gear over the current pose in world space, then parents it to the hand bone. */
  private arm(
    gear: Gear,
    hand: THREE.Object3D,
    elbow: THREE.Object3D,
    body: THREE.Object3D,
    team: string
  ) {
    const asset = this.assets[gear.file];
    if (!asset) return;
    const model = asset.scene.clone();
    share(model);
    if (gear.kind === 'shield')
      // The shield face (light wood) carries the faction colour.
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh && /LightWood/.test((mesh.material as THREE.Material).name)) {
          const key = `shield-${team}`;
          if (!this.materials.has(key))
            this.materials.set(
              key,
              new THREE.MeshStandardMaterial({ color: team, roughness: 0.75 })
            );
          mesh.material = this.materials.get(key)!;
        }
      });
    const raw = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    const holder = new THREE.Group();
    holder.add(model);
    model.scale.setScalar(gear.length / Math.max(raw.x, raw.y, raw.z));
    const box = new THREE.Box3().setFromObject(holder);
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(
      -center.x,
      -(box.min.y + (gear.grip ?? 0.5) * (box.max.y - box.min.y)),
      -center.z
    );
    const wrist = hand.getWorldPosition(new THREE.Vector3()),
      forearm = wrist.clone().sub(elbow.getWorldPosition(new THREE.Vector3()));
    const along = forearm.clone().normalize();
    if (gear.kind === 'held') {
      // Fist slightly past the wrist, pointing forward and a little up, flat side out.
      holder.position.copy(wrist).addScaledVector(along, forearm.length() * 0.3);
      const tilt = THREE.MathUtils.degToRad(gear.tilt ?? 25);
      holder.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt))
      );
      holder.rotateY(Math.PI / 2);
    } else if (gear.kind === 'bow') {
      holder.position.copy(wrist).addScaledVector(along, forearm.length() * 0.3);
      holder.rotation.set(0.25, Math.PI / 2, 0, 'YXZ');
    } else {
      // Strapped to the outside of the hanging forearm, face out to the side.
      const outward = new THREE.Vector3(gear.hand === 'l' ? 1 : -1, 0, 0.35).normalize();
      holder.position.copy(wrist).addScaledVector(forearm, -0.45).addScaledVector(outward, 0.07);
      holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward);
    }
    body.add(holder);
    body.updateMatrixWorld(true);
    hand.attach(holder);
  }

  /** Helmets and pauldrons centred over a bone at a given width. */
  private wear(
    file: string,
    bone: THREE.Object3D,
    body: THREE.Object3D,
    width: number,
    lift: number
  ) {
    const asset = this.assets[file];
    if (!asset) return;
    const part = asset.scene.clone();
    share(part);
    const size = new THREE.Box3().setFromObject(part).getSize(new THREE.Vector3());
    part.scale.multiplyScalar(width / Math.max(size.x, size.z));
    part.updateMatrixWorld(true);
    const center = new THREE.Box3().setFromObject(part).getCenter(new THREE.Vector3());
    const target = bone.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, lift, 0));
    part.position.add(target.sub(center));
    body.add(part);
    body.updateMatrixWorld(true);
    bone.attach(part);
  }
}

/** Library geometry/materials must survive the world disposing a unit. */
function share(object: THREE.Object3D) {
  object.traverse((o) => {
    o.userData.shared = true;
    o.castShadow = true;
  });
}

/** Scales an object so its size along an axis (height by default) matches the target. */
function fit(object: THREE.Object3D, size: number, axis: 'y' | 'z' = 'y') {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object, true);
  object.scale.multiplyScalar(size / box.getSize(new THREE.Vector3())[axis]);
}

/** Units drawn as animated characters (everything on foot or horseback). */
export const isCharacter = (type: UnitType) => !!LOOKS[type];

/** The loaded library, shared by every World (filled by characterAssets.ts in the browser). */
export const characterCache: { library: CharacterLibrary | null } = { library: null };
