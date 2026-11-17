/**
 * Animated soldiers: a root group driven by one AnimationMixer per rig (rider, horse), each with a
 * clip per pose. The voxel soldiers (voxel.ts) are the only source today.
 */
import * as THREE from 'three';

import type { UnitType } from '../game/engine';

export type Pose = 'idle' | 'walk' | 'attack' | 'hit' | 'death' | 'work';

export const LOOPING: Pose[] = ['idle', 'walk', 'work'];

export class Character {
  readonly root = new THREE.Group();
  pose: Pose = 'idle';
  /** One mixer per rig (rider, horse), each with its clip per pose. */
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
      // A looping pose already playing keeps its phase.
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

/** Anything that builds animated soldiers. */
export interface CharacterSource {
  has(type: UnitType): boolean;
  build(type: UnitType, team: string): Character;
}
