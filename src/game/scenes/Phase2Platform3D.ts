import * as THREE from "three";
import type { IScene } from "../engine/types";
import { audio } from "../engine/AudioEngine";

export type Phase2Result = { score: number; distance: number; timeElapsed: number; reason: "fall" | "scorpion" | "time" | "finish" };

type Platform = { x: number; y: number; w: number; h: number; mesh: THREE.Mesh };
type Pickup = { x: number; y: number; mesh: THREE.Mesh; taken: boolean };
type Enemy = { x: number; y: number; w: number; h: number; mesh: THREE.Mesh; vx: number; minX: number; maxX: number };

const GRAV = -55;
const JUMP_V = 18;
const PX_TO_UNITS = 8 / 210;
const PLAYER_W = 0.9;
const PLAYER_H = 0.7;
const WORLD_END = 90;

export class Phase2Platform3D implements IScene {
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  private player!: THREE.Group;
  private shadow!: THREE.Mesh;
  private px = 0;
  private py = 2;
  private vx = 0;
  private vy = 0;
  private onGround = false;
  private wantJump = false;
  private holdLeft = false;
  private holdRight = false;
  private platforms: Platform[] = [];
  private pickups: Pickup[] = [];
  private enemies: Enemy[] = [];
  score = 0;
  timeElapsed = 0;
  paused = true;
  ended = false;
  private gameStarted = false;
  private playerSpeed = 140;
  private scorpionSpeed = 55;
  private speedInterval: number | null = null;
  private scorpInterval: number | null = null;
  onHud?: (s: { score: number; distance: number; timeElapsed: number }) => void;
  onEnd?: (r: Phase2Result) => void;
  private disposeFns: Array<() => void> = [];

  constructor(w: number, h: number) {
    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 300);
    this.camera.position.set(0, 6, 14);
    this.camera.lookAt(0, 3, 0);

    this.scene.background = new THREE.Color("#e8b870");
    this.scene.fog = new THREE.Fog("#e8b870", 30, 90);

    this.scene.add(new THREE.AmbientLight(0xffe1b0, 0.85));
    const sun = new THREE.DirectionalLight(0xfff1cc, 1.1);
    sun.position.set(10, 20, 5);
    this.scene.add(sun);

    // Background mountains (simple cones)
    const mtnMat = new THREE.MeshStandardMaterial({ color: 0xb07840, roughness: 1 });
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(4 + Math.random() * 3, 4 + Math.random() * 4, 5), mtnMat);
      m.position.set(i * 14 - 10, 1, -18 - Math.random() * 4);
      this.scene.add(m);
      this.disposeFns.push(() => m.geometry.dispose());
    }
    this.disposeFns.push(() => mtnMat.dispose());

    // Floor (visible cracked sand) — purely visual; collision uses platforms
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xc89a55, roughness: 1 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_END + 40, 40), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(WORLD_END / 2, -8, 0);
    this.scene.add(floor);
    this.disposeFns.push(() => { floor.geometry.dispose(); floorMat.dispose(); });

    // Build platforms
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.95 });
    this.disposeFns.push(() => stoneMat.dispose());
    const addPlat = (x: number, y: number, w: number, h = 0.8) => {
      const geo = new THREE.BoxGeometry(w, h, 2.4);
      const mesh = new THREE.Mesh(geo, stoneMat);
      mesh.position.set(x, y, 0);
      this.scene.add(mesh);
      this.disposeFns.push(() => geo.dispose());
      this.platforms.push({ x, y, w, h, mesh });
    };

    // Ground stretches at the start
    addPlat(0, 0, 10);
    // Procedural-ish layout (deterministic so scoring stays fair)
    const layout: Array<[number, number, number]> = [
      [9, 0, 4], [14, 1.5, 3], [19, 2.8, 3], [24, 1.8, 3], [29, 0.5, 4],
      [35, 2.2, 3], [40, 3.4, 2.5], [45, 2.5, 3], [50, 1.2, 4], [56, 2.5, 3],
      [62, 3.6, 2.5], [68, 2.4, 3], [74, 1.5, 3.5], [80, 0.5, 6],
    ];
    for (const [x, y, w] of layout) addPlat(x, y, w);

    // Cactus end-flag
    const flagMat = new THREE.MeshStandardMaterial({ color: 0x2f6b1f, emissive: 0x123b08, emissiveIntensity: 0.5 });
    const flag = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 3, 8), flagMat);
    flag.position.set(82, 2.8, 0);
    this.scene.add(flag);
    this.disposeFns.push(() => { flag.geometry.dispose(); flagMat.dispose(); });

    // Pickups (insects/flowers) — emissive yellow blobs above platforms
    const pickMat = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xff8800, emissiveIntensity: 0.9 });
    this.disposeFns.push(() => pickMat.dispose());
    const pickPositions: Array<[number, number]> = [
      [3, 1.2], [9, 1.2], [14, 2.7], [19, 4], [24, 3], [29, 1.7],
      [35, 3.4], [40, 4.6], [45, 3.7], [50, 2.4], [56, 3.7],
      [62, 4.8], [68, 3.6], [74, 2.7], [80, 1.7],
    ];
    for (const [x, y] of pickPositions) {
      const geo = new THREE.SphereGeometry(0.28, 14, 14);
      const m = new THREE.Mesh(geo, pickMat);
      m.position.set(x, y, 0);
      this.scene.add(m);
      this.disposeFns.push(() => geo.dispose());
      this.pickups.push({ x, y, mesh: m, taken: false });
    }

    // Enemies (escorpiões) — patrol on platforms
    const enemyMat = new THREE.MeshStandardMaterial({ color: 0x3a1a0c, roughness: 0.6 });
    this.disposeFns.push(() => enemyMat.dispose());
    const enemyDefs: Array<[number, number, number, number]> = [
      // [centerX, y, range, platformWidth]
      [14, 1.9, 2, 3], [29, 0.9, 3, 4], [45, 2.9, 2, 3], [56, 2.9, 2.2, 3], [74, 1.9, 2.5, 3.5],
    ];
    for (const [cx, y, range] of enemyDefs) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), enemyMat);
      body.scale.set(1.2, 0.7, 1);
      g.add(body);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 8), enemyMat);
      tail.position.set(-0.4, 0.3, 0);
      tail.rotation.z = Math.PI / 4;
      g.add(tail);
      g.position.set(cx, y, 0);
      this.scene.add(g);
      this.enemies.push({
        x: cx, y, w: 0.9, h: 0.6, mesh: g as unknown as THREE.Mesh,
        vx: 55 * PX_TO_UNITS, minX: cx - range, maxX: cx + range,
      });
    }

    // Player (Dragão Barbudo) — capsule with bearded head
    this.player = new THREE.Group();
    const dragonMat = new THREE.MeshStandardMaterial({ color: 0xc9a26a, roughness: 0.7 });
    const beardMat = new THREE.MeshStandardMaterial({ color: 0x6a3a1a, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 6, 10), dragonMat);
    body.rotation.z = Math.PI / 2;
    this.player.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), dragonMat);
    head.position.set(0.55, 0.05, 0);
    this.player.add(head);
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), beardMat);
    beard.scale.set(1, 0.5, 1);
    beard.position.set(0.55, -0.18, 0);
    this.player.add(beard);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 8), dragonMat);
    tail.rotation.z = Math.PI / 2;
    tail.position.set(-0.7, 0, 0);
    this.player.add(tail);
    this.scene.add(this.player);
    this.disposeFns.push(() => {
      [body, head, beard, tail].forEach((m) => m.geometry.dispose());
      dragonMat.dispose(); beardMat.dispose();
    });

    // Blob shadow
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.shadow);
    this.disposeFns.push(() => { this.shadow.geometry.dispose(); shadowMat.dispose(); });

    this.px = 1;
    this.py = 2;
    this.syncPlayer();
  }

  start() {
    this.gameStarted = true;
    this.paused = false;

    this.speedInterval = window.setInterval(() => {
      if (this.paused || this.ended) return;
      this.playerSpeed = Math.min(this.playerSpeed + 12, 240);
    }, 30000);

    this.scorpInterval = window.setInterval(() => {
      if (this.paused || this.ended) return;
      this.scorpionSpeed = Math.min(this.scorpionSpeed + 8, 120);
      for (const e of this.enemies) {
        e.vx = Math.sign(e.vx) * this.scorpionSpeed * PX_TO_UNITS;
      }
    }, 45000);
  }

  onResize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  onKeyDown(e: KeyboardEvent) {
    if (!this.gameStarted) return;
    const k = e.key.toLowerCase();
    if (k === " " || k === "arrowup" || k === "w") this.wantJump = true;
    if (k === "arrowleft" || k === "a") this.holdLeft = true;
    if (k === "arrowright" || k === "d") this.holdRight = true;
  }
  onKeyUp = (e: KeyboardEvent) => {
    if (!this.gameStarted) return;
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") this.holdLeft = false;
    if (k === "arrowright" || k === "d") this.holdRight = false;
  };

  setHold(d: "left" | "right", v: boolean) {
    if (!this.gameStarted) return;
    if (d === "left") this.holdLeft = v;
    else this.holdRight = v;
  }
  doJump() {
    if (!this.gameStarted) return;
    this.wantJump = true;
  }

  private syncPlayer() {
    this.player.position.set(this.px, this.py, 0);
  }

  private platformUnder(x: number, y: number, prevY: number): Platform | null {
    // Returns platform whose top the player is landing on this frame (when descending).
    for (const p of this.platforms) {
      const left = p.x - p.w / 2;
      const right = p.x + p.w / 2;
      const top = p.y + p.h / 2;
      if (x + PLAYER_W / 2 > left && x - PLAYER_W / 2 < right) {
        const playerBottomNow = y - PLAYER_H / 2;
        const playerBottomPrev = prevY - PLAYER_H / 2;
        if (playerBottomPrev >= top - 0.01 && playerBottomNow <= top + 0.01) {
          return p;
        }
      }
    }
    return null;
  }

  private nearestGroundY(x: number): number {
    // For shadow projection — top of the highest platform under x.
    let best = -8;
    for (const p of this.platforms) {
      const left = p.x - p.w / 2;
      const right = p.x + p.w / 2;
      const top = p.y + p.h / 2;
      if (x >= left && x <= right && top > best && top <= this.py - PLAYER_H / 2 + 0.05) best = top;
    }
    return best;
  }

  private end(reason: Phase2Result["reason"]) {
    if (this.ended) return;
    this.ended = true;
    if (reason === "finish") audio.sfxWin();
    else audio.sfxGameOver();
    this.onEnd?.({
      score: this.score + (reason === "finish" ? 50 : 0),
      distance: Math.round(this.px),
      timeElapsed: Math.min(300, Math.floor(this.timeElapsed)),
      reason,
    });
  }

  update(dt: number, elapsed: number) {
    if (this.paused || this.ended || !this.gameStarted) return;
    this.timeElapsed += dt;
    if (this.timeElapsed >= 300) {
      this.timeElapsed = 300;
      this.end("time");
      return;
    }

    // Horizontal: auto-run forward + manual nudges
    let target = this.playerSpeed * PX_TO_UNITS;
    if (this.holdLeft) target -= this.playerSpeed * PX_TO_UNITS;
    if (this.holdRight) target += (this.playerSpeed * PX_TO_UNITS) * 0.4;
    this.vx = target;

    // Jump
    if (this.wantJump && this.onGround) {
      this.vy = JUMP_V;
      this.onGround = false;
      audio.sfxClick();
    }
    this.wantJump = false;

    // Gravity
    this.vy += GRAV * dt;

    const prevY = this.py;
    this.px += this.vx * dt;
    this.py += this.vy * dt;

    // Land on platform
    if (this.vy <= 0) {
      const p = this.platformUnder(this.px, this.py, prevY);
      if (p) {
        this.py = p.y + p.h / 2 + PLAYER_H / 2;
        this.vy = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }
    } else {
      this.onGround = false;
    }

    // Fall off the world
    if (this.py < -5) return this.end("fall");

    // Goal
    if (this.px >= 82) return this.end("finish");

    // Pickups
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      const dx = this.px - pk.x;
      const dy = this.py - pk.y;
      if (dx * dx + dy * dy < 0.6 * 0.6) {
        pk.taken = true;
        pk.mesh.visible = false;
        this.score += 10;
        audio.sfxEat();
      }
    }

    // Enemies — patrol + collision
    for (const e of this.enemies) {
      e.x += e.vx * dt;
      if (e.x < e.minX) { e.x = e.minX; e.vx *= -1; }
      if (e.x > e.maxX) { e.x = e.maxX; e.vx *= -1; }
      e.mesh.position.x = e.x;
      e.mesh.rotation.y = e.vx > 0 ? 0 : Math.PI;
      const dx = Math.abs(this.px - e.x);
      const dy = Math.abs(this.py - e.y);
      if (dx < (PLAYER_W + e.w) / 2 && dy < (PLAYER_H + e.h) / 2) {
        // Stomp if descending and clearly above
        if (this.vy < -2 && this.py - PLAYER_H / 2 > e.y) {
          e.x = -999;
          e.mesh.visible = false;
          this.vy = JUMP_V * 0.7;
          this.score += 25;
          audio.sfxEat();
        } else {
          return this.end("scorpion");
        }
      }
    }

    // Idle pickup pulse
    for (const pk of this.pickups) {
      if (!pk.taken) pk.mesh.position.y = pk.y + Math.sin(elapsed * 4 + pk.x) * 0.1;
    }

    // Player visuals
    this.syncPlayer();
    this.player.rotation.z = this.onGround ? 0 : THREE.MathUtils.clamp(this.vy * 0.04, -0.4, 0.4);

    // Shadow
    const gy = this.nearestGroundY(this.px);
    this.shadow.position.set(this.px, gy + 0.02, 0);
    const distAir = Math.max(0, this.py - PLAYER_H / 2 - gy);
    this.shadow.scale.setScalar(Math.max(0.4, 1 - distAir * 0.08));
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.1, 0.4 - distAir * 0.04);

    // Camera follow
    this.camera.position.x = this.px - 1.5;
    this.camera.position.y = Math.max(4, this.py + 3);
    this.camera.lookAt(this.px + 4, this.py + 0.5, 0);

    this.onHud?.({ score: this.score, distance: Math.round(this.px), timeElapsed: Math.min(300, Math.floor(this.timeElapsed)) });
  }

  dispose() {
    this.disposeFns.forEach((f) => f());
    if (this.speedInterval) clearInterval(this.speedInterval);
    if (this.scorpInterval) clearInterval(this.scorpInterval);
  }
}

export const PHASE2_GOAL = 82;
