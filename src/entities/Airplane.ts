import * as THREE from 'three';

// Friendly low-poly toy airplane built only from primitives.
// The nose points toward +Z.
export class Airplane extends THREE.Group {
  readonly propeller: THREE.Group;
  private navMat: THREE.MeshStandardMaterial;
  private bounceT = 0;

  constructor() {
    super();

    const body = new THREE.Group();
    this.add(body);

    const matBody = new THREE.MeshStandardMaterial({ color: 0xef5350, roughness: 0.55, flatShading: true });
    const matWhite = new THREE.MeshStandardMaterial({ color: 0xfff6e6, roughness: 0.5, flatShading: true });
    const matWing = new THREE.MeshStandardMaterial({ color: 0xffc93c, roughness: 0.55, flatShading: true });
    const matBlue = new THREE.MeshStandardMaterial({ color: 0x42a5f5, roughness: 0.55, flatShading: true });
    const matWindow = new THREE.MeshStandardMaterial({
      color: 0xbbdefb,
      roughness: 0.2,
      metalness: 0.2,
      emissive: 0x90caf9,
      emissiveIntensity: 0.2
    });

    // Fuselage
    const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.5, 4, 12), matBody);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.castShadow = true;
    body.add(fuselage);

    // Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 10), matBody);
    nose.position.z = 1.05;
    body.add(nose);

    // Cockpit canopy
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), matWindow);
    canopy.scale.set(0.9, 0.7, 1.3);
    canopy.position.set(0, 0.34, 0.45);
    body.add(canopy);

    // Main wing
    const wing = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 0.8), matWing);
    wing.position.set(0, 0.02, -0.05);
    wing.castShadow = true;
    body.add(wing);

    // Wingtips
    const tipL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), matWing);
    tipL.position.set(-1.5, 0.05, -0.05);
    const tipR = tipL.clone();
    tipR.position.x = 1.5;
    body.add(tipL, tipR);

    // Vertical fin
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.6), matBlue);
    fin.position.set(0, 0.45, -1.0);
    fin.rotation.x = -0.25;
    body.add(fin);

    // Horizontal stabilizer
    const stab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.5), matBlue);
    stab.position.set(0, 0.12, -1.05);
    body.add(stab);

    // Round windows
    for (let i = 0; i < 3; i++) {
      const z = 0.2 + i * 0.42;
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), matWindow);
      w.scale.set(0.55, 0.55, 1);
      w.position.set(0.37, 0.05, z);
      body.add(w);
      const w2 = w.clone();
      w2.position.x = -0.37;
      body.add(w2);
    }

    // Propeller
    const propeller = new THREE.Group();
    propeller.position.z = 1.5;
    body.add(propeller);
    this.propeller = propeller;

    const spinner = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), matWhite);
    propeller.add(spinner);

    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.4 });
    for (let i = 0; i < 2; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.25, 0.03), bladeMat);
      blade.position.y = i === 0 ? 0.32 : -0.32;
      propeller.add(blade);
    }

    // Navigation lights (visible at night)
    this.navMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff59d,
      emissiveIntensity: 0,
      roughness: 0.3
    });
    const navSpots: [number, number, number][] = [
      [-1.5, 0.05, -0.05],
      [1.5, 0.05, -0.05],
      [0, 0.75, -1.0]
    ];
    for (const [x, y, z] of navSpots) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), this.navMat);
      l.position.set(x, y, z);
      body.add(l);
    }
  }

  setNightLights(on: boolean): void {
    this.navMat.emissiveIntensity = on ? 2.5 : 0;
  }

  playBounce(): void {
    this.bounceT = 0.28;
  }

  update(dt: number): void {
    this.propeller.rotation.z += 28 * dt;
    if (this.bounceT > 0) {
      this.bounceT -= dt;
      const k = Math.max(0, this.bounceT) / 0.28;
      this.scale.setScalar(1 + Math.sin((1 - k) * Math.PI) * 0.18);
    } else {
      this.scale.setScalar(1);
    }
  }
}
