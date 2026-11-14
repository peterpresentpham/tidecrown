/** Browser loader for the packed character files (src/render/assets/units/*.glb). */
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { type Asset, characterCache, CharacterLibrary } from './characters';

const FILES = import.meta.glob('./assets/units/*.glb', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

let pending: Promise<CharacterLibrary | null> | null = null;

/** Fetches every character file once; resolves null if any of them fails. */
export function loadCharacters() {
  pending ??= (async () => {
    try {
      const loader = new GLTFLoader();
      const entries = await Promise.all(
        Object.entries(FILES).map(async ([path, url]) => {
          const gltf = await loader.loadAsync(url);
          const name = path.replace(/^.*\//, '').replace(/\.glb$/, '');
          return [name, { scene: gltf.scene, animations: gltf.animations }] as [string, Asset];
        })
      );
      characterCache.library = new CharacterLibrary(Object.fromEntries(entries));
      return characterCache.library;
    } catch (error) {
      console.error('Character models failed to load', error);
      return null;
    }
  })();
  return pending;
}
