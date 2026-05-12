import * as THREE from "three";
import type { IScene } from "../engine/types";
import { audio } from "../engine/AudioEngine";

export type Phase3Result = {
  score: number;
  fish: number;
  distance: number;
  timeElapsed: number;
  reason: "pillar" | "boat" | "trash" | "time" | "finish";
};

const WORLD_LEN = 90;
const RIVER_HALF = 5; // z bounds
const PLAYER_LEN = 1.6;
const PLAYER_HALF_W = 0.45;
const SWIM_V = 7;
const GOAL_X = 80;

type Pillar = { x: number; z: number; r: number; mesh: THREE.Mesh };
type Boat = { x: number; z: number; vz: number; minZ: number; maxZ: number; w: number; d: number; mesh: THREE.Group };
type Fish = { x: number; z: number; mesh: THREE.Mesh; taken: boolean };
type Trash = { x: number; z: number; r: number; mesh: THREE.Mesh };

export const PHASE3_GOAL = GOAL_X;

export class Phase3Water3D implements IScene {
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  private gator!: THREE.Group;
  private water!: THREE.Mesh;
  private px = 1;
  private pz = 0;
  private holdL = false;
  private holdR = false;
  private holdU = false;
  private holdD = false;
  private pillars: Pillar[] = [];
  private boats: Boat[] = [];
  private fishes: Fish[] = [];
  private trash: Trash[] = [];
  score = 0;
  fishCount = 0;
  timeElapsed = 0;
  paused = true;
  ended = false;
  private gameStarted = false;
  onHud?: (s: { score: number; fish: number; distance: number; timeElapsed: number }) => void;
  onEnd?: (r: Phase3Result) => void;
  private disposeFns: Array<() => void> = [];

  constructor(w: number, h: number) {
    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 300);
    this.camera.position.set(0, 9, 10);
    this.camera.lookAt(0, 0, 0);

    this.scene.background = new THREE.Color("#3a5a3a");
    this.scene.fog = new THREE.Fog("#3a5a3a", 30, 80);

    this.scene.add(new THREE.AmbientLight(0xc8e0c0, 0.85));
    const sun = new THREE.DirectionalLight(0xffffe6, 1.0);
    sun.position.set(8, 18, 6);
    this.scene.add(sun);

    // Banks (margens)
    const bankMat = new THREE.MeshStandardMaterial({ color: 0x6b4a23, roughness: 1 });
    this.disposeFns.push(() => bankMat.dispose());
    const bankGeo = new THREE.BoxGeometry(WORLD_LEN + 40, 0.6, 6);
    for (const z of [RIVER_HALF + 3, -(RIVER_HALF + 3)]) {
      const b = new THREE.Mesh(bankGeo, bankMat);
      b.position.set(WORLD_LEN / 2, -0.3, z);
      this.scene.add(b);
    }
    this.disposeFns.push(() => bankGeo.dispose());

    // Reeds on banks (decoration)
    const reedMat = new THREE.MeshStandardMaterial({ color: 0x365a22, roughness: 1 });
    this.disposeFns.push(() => reedMat.dispose());
    const reedGeo = new THREE.ConeGeometry(0.18, 0.8, 5);
    this.disposeFns.push(() => reedGeo.dispose());
    for (let i = 0; i < 60; i++) {
      const m = new THREE.Mesh(reedGeo, reedMat);
      const side = i % 2 === 0 ? 1 : -1;
      m.position.set(Math.random() * WORLD_LEN, 0.2, side * (RIVER_HALF + 1.2 + Math.random() * 2));
      this.scene.add(m);
    }

    // Water
    const waterGeo = new THREE.PlaneGeometry(WORLD_LEN + 40, RIVER_HALF * 2 + 0.4, 80, 12);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2e6e4a,
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92,
      emissive: 0x0a2a18,
      emissiveIntensity: 0.2,
    });
    this.water = new THREE.Mesh(waterGeo, waterMat);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(WORLD_LEN / 2, 0, 0);
    this.scene.add(this.water);
    this.disposeFns.push(() => { waterGeo.dispose(); waterMat.dispose(); });

    // Bridge pillars (cilindros) — pares atravessando o rio
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.95 });
    this.disposeFns.push(() => pillarMat.dispose());
    const bridgeXs = [12, 28, 46, 62, 76];
    for (const bx of bridgeXs) {
      // Pilares laterais
      for (const pz of [-2.5, 0, 2.5]) {
        const r = 0.7;
        const geo = new THREE.CylinderGeometry(r, r * 1.1, 4, 14);
        const m = new THREE.Mesh(geo, pillarMat);
        m.position.set(bx, 1.5, pz);
        this.scene.add(m);
        this.disposeFns.push(() => geo.dispose());
        this.pillars.push({ x: bx, z: pz, r: r * 0.92, mesh: m });
      }
      // Tabuleiro (visual only)
      const deckGeo = new THREE.BoxGeometry(2, 0.25, RIVER_HALF * 2 + 2);
      const deck = new THREE.Mesh(deckGeo, pillarMat);
      deck.position.set(bx, 3.6, 0);
      this.scene.add(deck);
      this.disposeFns.push(() => deckGeo.dispose());
    }

    // Boats — patrol along Z
    const boatHullMat = new THREE.MeshStandardMaterial({ color: 0x8a3a1a, roughness: 0.7 });
    const boatTopMat = new THREE.MeshStandardMaterial({ color: 0xd2b070, roughness: 0.8 });
    this.disposeFns.push(() => { boatHullMat.dispose(); boatTopMat.dispose(); });
    const boatXs: Array<[number, number]> = [
      [20, 1.6], [38, -1.6], [54, 1.6], [70, -1.6],
    ];
    for (const [bx, dir] of boatXs) {
      const g = new THREE.Group();
      const hullGeo = new THREE.BoxGeometry(2.2, 0.4, 1);
      const hull = new THREE.Mesh(hullGeo, boatHullMat);
      g.add(hull);
      const topGeo = new THREE.BoxGeometry(1.2, 0.3, 0.6);
      const top = new THREE.Mesh(topGeo, boatTopMat);
      top.position.y = 0.35;
      g.add(top);
      g.position.set(bx, 0.35, 0);
      this.scene.add(g);
      this.disposeFns.push(() => { hullGeo.dispose(); topGeo.dispose(); });
      this.boats.push({
        x: bx, z: 0, vz: 1.6 * dir,
        minZ: -RIVER_HALF + 1.3, maxZ: RIVER_HALF - 1.3,
        w: 2.4, d: 1.2,
        mesh: g,
      });
    }

    // Fish pickups (peixes) — emissive cyan
    const fishMat = new THREE.MeshStandardMaterial({
      color: 0x88ddee, emissive: 0x33aacc, emissiveIntensity: 0.9, roughness: 0.4,
    });
    this.disposeFns.push(() => fishMat.dispose());
    const fishGeo = new THREE.SphereGeometry(0.28, 12, 12);
    this.disposeFns.push(() => fishGeo.dispose());
    const fishPos: Array<[number, number]> = [
      [6, 1.5], [9, -1.5], [16, -2.8], [22, 2.7], [25, -3], [32, 0],
      [36, 2.5], [42, -2.5], [48, 0], [52, 2.5], [58, -2], [66, 2],
      [72, -2.5], [78, 1.5],
    ];
    for (const [x, z] of fishPos) {
      const m = new THREE.Mesh(fishGeo, fishMat);
      m.scale.set(1.2, 0.7, 0.7);
      m.position.set(x, 0.25, z);
      this.scene.add(m);
      this.fishes.push({ x, z, mesh: m, taken: false });
    }

    // Trash (lixo flutuante) — penalty + ends run if hit
    const trashMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 1 });
    this.disposeFns.push(() => trashMat.dispose());
    const trashGeo = new THREE.BoxGeometry(0.5, 0.2, 0.5);
    this.disposeFns.push(() => trashGeo.dispose());
    const trashPos: Array<[number, number]> = [
      [18, 0.5], [34, -1], [50, 1.2], [64, -0.5],
    ];
    for (const [x, z] of trashPos) {
      const m = new THREE.Mesh(trashGeo, trashMat);
      m.position.set(x, 0.2, z);
      this.scene.add(m);
      this.trash.push({ x, z, r: 0.45, mesh: m });
    }

    // Goal — placa "Açude Velho"
    const goalMat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xff8800, emissiveIntensity: 0.6 });
    const goalPostMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a });
    const goalGeo = new THREE.BoxGeometry(2.4, 1.2, 0.15);
    const goalPostGeo = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
    const goal = new THREE.Mesh(goalGeo, goalMat);
    goal.position.set(GOAL_X + 2, 1.5, 0);
    const post1 = new THREE.Mesh(goalPostGeo, goalPostMat);
    post1.position.set(GOAL_X + 2, 0.7, -1);
    const post2 = post1.clone();
    post2.position.z = 1;
    this.scene.add(goal, post1, post2);
    this.disposeFns.push(() => {
      goalGeo.dispose(); goalPostGeo.dispose();
      goalMat.dispose(); goalPostMat.dispose();
    });

    // Jacaré (player)
    this.gator = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x3e5a25, roughness: 0.9 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xc9b76a, roughness: 0.8 });
    this.disposeFns.push(() => { skinMat.dispose(); bellyMat.dispose(); });
    const bodyGeo = new THREE.BoxGeometry(1.3, 0.35, 0.55);
    const body = new THREE.Mesh(bodyGeo, skinMat);
    body.position.x = 0;
    this.gator.add(body);
    const bellyGeo = new THREE.BoxGeometry(1.2, 0.1, 0.5);
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, -0.2, 0);
    this.gator.add(belly);
    const headGeo = new THREE.BoxGeometry(0.55, 0.28, 0.45);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0.85, 0.05, 0);
    this.gator.add(head);
    const tailGeo = new THREE.ConeGeometry(0.2, 0.7, 8);
    const tail = new THREE.Mesh(tailGeo, skinMat);
    tail.rotation.z = -Math.PI / 2;
    tail.position.set(-0.95, 0, 0);
    this.gator.add(tail);
    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xff8800, emissiveIntensity: 0.6 });
    this.disposeFns.push(() => eyeMat.dispose());
    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    for (const ez of [-0.13, 0.13]) {
      const e = new THREE.Mesh(eyeGeo, eyeMat);
      e.position.set(0.95, 0.18, ez);
      this.gator.add(e);
    }
    // Scales (small bumps along back)
    const scaleGeo = new THREE.ConeGeometry(0.06, 0.12, 5);
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(scaleGeo, skinMat);
      s.position.set(-0.5 + i * 0.18, 0.22, 0);
      this.gator.add(s);
    }
    this.gator.position.set(this.px, 0.05, this.pz);
    this.scene.add(this.gator);
    this.disposeFns.push(() => {
      [bodyGeo, bellyGeo, headGeo, tailGeo, eyeGeo, scaleGeo].forEach((g) => g.dispose());
    });

    // Easter egg — placa "Açude Velho"
    // (already part of goal area)
  }

  start() {
    this.gameStarted = true;
    this.paused = false;
  }

  onResize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  onKeyDown(e: KeyboardEvent) {
    if (!this.gameStarted) return;
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") this.holdL = true;
    if (k === "arrowright" || k === "d") this.holdR = true;
    if (k === "arrowup" || k === "w") this.holdU = true;
    if (k === "arrowdown" || k === "s") this.holdD = true;
  }
  onKeyUp = (e: KeyboardEvent) => {
    if (!this.gameStarted) return;
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") this.holdL = false;
    if (k === "arrowright" || k === "d") this.holdR = false;
    if (k === "arrowup" || k === "w") this.holdU = false;
    if (k === "arrowdown" || k === "s") this.holdD = false;
  };

  setDirection(d: "up" | "down" | "left" | "right" | "none") {
    if (!this.gameStarted) return;
    this.holdL = this.holdR = this.holdU = this.holdD = false;
    if (d === "up") this.holdU = true;
    if (d === "down") this.holdD = true;
    if (d === "left") this.holdL = true;
    if (d === "right") this.holdR = true;
  }

  private end(reason: Phase3Result["reason"]) {
    if (this.ended) return;
    this.ended = true;
    if (reason === "finish") audio.sfxWin();
    else audio.sfxGameOver();
    this.onEnd?.({
      score: this.score + (reason === "finish" ? 60 : 0),
      fish: this.fishCount,
      distance: Math.round(this.px),
      timeElapsed: Math.min(300, Math.floor(this.timeElapsed)),
      reason,
    });
  }

  private collidesPillar(x: number, z: number): boolean {
    // Treat gator as ellipse/box AABB; pillar as circle. Use circle vs AABB.
    for (const p of this.pillars) {
      const closestX = Math.max(x - PLAYER_LEN / 2, Math.min(p.x, x + PLAYER_LEN / 2));
      const closestZ = Math.max(z - PLAYER_HALF_W, Math.min(p.z, z + PLAYER_HALF_W));
      const dx = p.x - closestX;
      const dz = p.z - closestZ;
      if (dx * dx + dz * dz < p.r * p.r) return true;
    }
    return false;
  }

  private collidesBoat(x: number, z: number): Boat | null {
    for (const b of this.boats) {
      const dx = Math.abs(x - b.x);
      const dz = Math.abs(z - b.z);
      if (dx < (PLAYER_LEN + b.w) / 2 && dz < (PLAYER_HALF_W * 2 + b.d) / 2) return b;
    }
    return null;
  }

  private collidesTrash(x: number, z: number): Trash | null {
    for (const t of this.trash) {
      const closestX = Math.max(x - PLAYER_LEN / 2, Math.min(t.x, x + PLAYER_LEN / 2));
      const closestZ = Math.max(z - PLAYER_HALF_W, Math.min(t.z, z + PLAYER_HALF_W));
      const dx = t.x - closestX;
      const dz = t.z - closestZ;
      if (dx * dx + dz * dz < t.r * t.r) return t;
    }
    return null;
  }

  update(dt: number, elapsed: number) {
    if (this.paused || this.ended || !this.gameStarted) return;
    this.timeElapsed += dt;
    if (this.timeElapsed >= 300) {
      this.timeElapsed = 300;
      this.end("time");
      return;
    }

    // Movement (Z = strafe; X = forward/back). Slight forward auto-drift.
    let vx = 0;
    let vz = 0;
    if (this.holdU) vz -= SWIM_V;
    if (this.holdD) vz += SWIM_V;
    if (this.holdR) vx += SWIM_V;
    if (this.holdL) vx -= SWIM_V * 0.8;
    vx += 1.5; // gentle current

    let nx = this.px + vx * dt;
    let nz = this.pz + vz * dt;

    // Bounds
    nz = Math.max(-RIVER_HALF + 0.5, Math.min(RIVER_HALF - 0.5, nz));
    nx = Math.max(0.5, nx);

    // Pillar collision (axis-separated to allow sliding)
    if (!this.collidesPillar(nx, this.pz)) this.px = nx;
    if (!this.collidesPillar(this.px, nz)) this.pz = nz;

    // Boat collision (deadly)
    const boatHit = this.collidesBoat(this.px, this.pz);
    if (boatHit) return this.end("boat");

    // Trash collision (deadly + sad)
    const trashHit = this.collidesTrash(this.px, this.pz);
    if (trashHit) return this.end("trash");

    // Boats patrol
    for (const b of this.boats) {
      b.z += b.vz * dt;
      if (b.z < b.minZ) { b.z = b.minZ; b.vz *= -1; }
      if (b.z > b.maxZ) { b.z = b.maxZ; b.vz *= -1; }
      b.mesh.position.z = b.z;
      b.mesh.position.y = 0.35 + Math.sin(elapsed * 2 + b.x) * 0.05;
      b.mesh.rotation.z = Math.sin(elapsed * 2 + b.x) * 0.06;
    }

    // Fish pickups
    for (const f of this.fishes) {
      if (f.taken) continue;
      const dx = this.px - f.x;
      const dz = this.pz - f.z;
      if (dx * dx + dz * dz < 0.7 * 0.7) {
        f.taken = true;
        f.mesh.visible = false;
        this.fishCount += 1;
        this.score += 15;
        audio.sfxEat();
      } else {
        f.mesh.position.y = 0.25 + Math.sin(elapsed * 3 + f.x) * 0.08;
      }
    }

    // Goal
    if (this.px >= GOAL_X) return this.end("finish");

    // Player visuals — sway + slight tilt
    const heading = Math.atan2(-vz, Math.max(0.1, vx));
    this.gator.rotation.y = heading;
    this.gator.position.set(this.px, 0.05 + Math.sin(elapsed * 4) * 0.03, this.pz);

    // Water shimmer
    const pos = (this.water.geometry as THREE.PlaneGeometry).attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const ux = pos.getX(i);
      const uy = pos.getY(i);
      pos.setZ(i, Math.sin(ux * 0.3 + elapsed * 1.6) * 0.07 + Math.cos(uy * 0.4 + elapsed * 1.3) * 0.05);
    }
    pos.needsUpdate = true;

    // Camera follow (slight angle, behind/above)
    this.camera.position.x = this.px - 5;
    this.camera.position.y = 8;
    this.camera.position.z = this.pz + 7;
    this.camera.lookAt(this.px + 4, 0, this.pz);

    this.onHud?.({
      score: this.score,
      fish: this.fishCount,
      distance: Math.round(this.px),
      timeElapsed: Math.min(300, Math.floor(this.timeElapsed)),
    });
  }

  dispose() {
    this.disposeFns.forEach((f) => f());
  }
}
