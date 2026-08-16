import * as THREE from 'three';

export interface ClickableEntry {
  object: THREE.Object3D;
  onTap: () => void;
}

// Registry of tappable objects; raycasts against them on tap.
export class Clickables {
  private map = new Map<string, ClickableEntry>();

  register(object: THREE.Object3D, onTap: () => void): void {
    this.map.set(object.uuid, { object, onTap });
  }

  pick(raycaster: THREE.Raycaster): ClickableEntry | null {
    const targets: THREE.Object3D[] = [];
    for (const e of this.map.values()) {
      e.object.traverse((o) => {
        if ((o as THREE.Mesh).isMesh || (o as THREE.Sprite).isSprite) targets.push(o);
      });
    }
    if (targets.length === 0) return null;
    const hits = raycaster.intersectObjects(targets, false);
    for (const hit of hits) {
      let cur: THREE.Object3D | null = hit.object;
      while (cur) {
        const e = this.map.get(cur.uuid);
        if (e) return e;
        cur = cur.parent;
      }
    }
    return null;
  }
}
