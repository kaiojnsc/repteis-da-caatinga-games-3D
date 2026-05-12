import * as THREE from "three";
import type { IScene } from "../engine/types";

export type RecintoHit = { id: 1 | 2 | 3 } | null;

export class MapScene3D implements IScene {
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-10, -10);
  private recintos: { id: 1 | 2 | 3; group: THREE.Group; vidro: THREE.Mesh; animal: THREE.Group; star?: THREE.Mesh }[] = [];
  private disposeFns: Array<() => void> = [];
  private hovered: 1 | 2 | 3 | null = null;
  onHoverChange?: (id: 1 | 2 | 3 | null, screen: { x: number; y: number } | null, name: string | null) => void;
  onSelect?: (id: 1 | 2 | 3) => void;
  private domSize = { w: 1, h: 1 };

  constructor(w: number, h: number, completed: { 1: boolean; 2: boolean; 3: boolean }) {
    this.domSize = { w, h };
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    this.camera.position.set(0, 8, 16);
    this.camera.lookAt(0, 1.5, 0);

    this.scene.background = new THREE.Color("#241a10");
    this.scene.fog = new THREE.Fog("#241a10", 25, 60);

    // Chão
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x6b4a23, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), groundMat);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    this.disposeFns.push(() => { ground.geometry.dispose(); groundMat.dispose(); });

    // Luzes
    this.scene.add(new THREE.AmbientLight(0xffe1b0, 0.7));
    const dir = new THREE.DirectionalLight(0xfff1cc, 1.0);
    dir.position.set(8, 14, 8);
    this.scene.add(dir);

    // Recintos
    const positions: Array<[number, number]> = [
      [-7, 0],
      [0, 0],
      [7, 0],
    ];
    const ids: Array<1 | 2 | 3> = [1, 2, 3];
    const animalNames = ["Juquinha", "Dragão Barbudo", "Jacaré"];
    const builders = [buildSnake, buildLizard, buildGator];

    for (let i = 0; i < 3; i++) {
      const id = ids[i];
      const group = new THREE.Group();
      group.position.set(positions[i][0], 0, positions[i][1]);
      // base
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x3a2615, roughness: 0.9 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 4), baseMat);
      base.position.y = 0.2;
      group.add(base);
      this.disposeFns.push(() => { base.geometry.dispose(); baseMat.dispose(); });

      // vidro
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xaaccee,
        transparent: true,
        opacity: 0.18,
        roughness: 0.05,
        metalness: 0,
        transmission: 0.9,
        emissive: 0x000000,
      });
      const glass = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3, 3.6), glassMat);
      glass.position.y = 1.9;
      glass.userData = { recintoId: id, name: animalNames[i] };
      group.add(glass);
      this.disposeFns.push(() => { glass.geometry.dispose(); glassMat.dispose(); });

      // animal
      const animal = builders[i]();
      animal.position.y = 0.5;
      group.add(animal);

      // estrela se concluído
      let star: THREE.Mesh | undefined;
      if (completed[id]) {
        star = makeStar();
        star.position.y = 4.2;
        group.add(star);
      }

      this.scene.add(group);
      this.recintos.push({ id, group, vidro: glass, animal, star });
    }
  }

  setDomSize(w: number, h: number) {
    this.domSize = { w, h };
  }

  onResize(w: number, h: number) {
    this.domSize = { w, h };
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  onPointerMove(x: number, y: number) {
    this.pointer.x = (x / this.domSize.w) * 2 - 1;
    this.pointer.y = -(y / this.domSize.h) * 2 + 1;
  }

  onPointerDown(x: number, y: number) {
    // Força cálculo imediato do raycast pro toque funcionar
    this.onPointerMove(x, y);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.recintos.map((r) => r.vidro));
    const hitId = hits[0] ? (hits[0].object.userData.recintoId as 1 | 2 | 3) : null;

    if (hitId) {
      this.hovered = hitId;
      this.onSelect?.(hitId);
    }
  }

  update(_dt: number, elapsed: number) {
    // Idle animations
    for (const r of this.recintos) {
      r.animal.rotation.y = elapsed * 0.4 + r.id;
      r.animal.position.y = 0.5 + Math.sin(elapsed * 1.5 + r.id) * 0.08;
      if (r.star) {
        r.star.rotation.y = elapsed * 2;
        r.star.position.y = 4.2 + Math.sin(elapsed * 2) * 0.15;
      }
    }
    // Raycast
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.recintos.map((r) => r.vidro));
    const hitId: 1 | 2 | 3 | null = hits[0] ? (hits[0].object.userData.recintoId as 1 | 2 | 3) : null;
    if (hitId !== this.hovered) {
      // reset previous emissive
      for (const r of this.recintos) {
        const m = r.vidro.material as THREE.MeshPhysicalMaterial;
        m.emissive = new THREE.Color(r.id === hitId ? 0xffd166 : 0x000000);
        m.emissiveIntensity = r.id === hitId ? 0.6 : 0;
      }
      this.hovered = hitId;
    }
    if (this.hovered) {
      const r = this.recintos.find((x) => x.id === this.hovered)!;
      const v = new THREE.Vector3(r.group.position.x, 4.5, r.group.position.z).project(this.camera);
      const sx = ((v.x + 1) / 2) * this.domSize.w;
      const sy = ((-v.y + 1) / 2) * this.domSize.h;
      this.onHoverChange?.(this.hovered, { x: sx, y: sy }, r.vidro.userData.name);
    } else {
      this.onHoverChange?.(null, null, null);
    }
  }

  dispose() {
    this.disposeFns.forEach((f) => f());
    this.recintos.forEach((r) => {
      r.animal.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mm = mesh.material;
        if (Array.isArray(mm)) mm.forEach((m) => m.dispose());
        else if (mm) mm.dispose();
      });
      if (r.star) {
        r.star.geometry.dispose();
        (r.star.material as THREE.Material).dispose();
      }
    });
  }
}

function buildSnake(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xf5e6c8, roughness: 0.6 });
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.18 - i * 0.008, 12, 12), mat);
    const a = i * 0.5;
    s.position.set(Math.cos(a) * 0.6, 0.2 + Math.sin(i * 0.5) * 0.1, Math.sin(a) * 0.6);
    g.add(s);
  }
  return g;
}

function buildLizard(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xc9a26a, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.8, 4, 8), mat);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), mat);
  head.position.x = 0.7;
  g.add(head);
  for (let i = 0; i < 4; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 6), mat);
    leg.position.set(i < 2 ? 0.4 : -0.3, -0.1, i % 2 === 0 ? 0.2 : -0.2);
    g.add(leg);
  }
  return g;
}

function buildGator(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x4a5e2a, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.5), mat);
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.4), mat);
  head.position.x = 0.85;
  g.add(head);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 8), mat);
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -1;
  g.add(tail);
  return g;
}

function makeStar(): THREE.Mesh {
  const shape = new THREE.Shape();
  const points = 5;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? 0.4 : 0.18;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
  const mat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffaa33, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  return m;
}
