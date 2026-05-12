import * as THREE from "three";
import type { IScene } from "../engine/types";
import { audio } from "../engine/AudioEngine";

type Dir = { x: number; z: number };
const GRID = 20;

export type Phase1Result = { score: number; length: number; timeElapsed: number; reason: "wall" | "self" | "obstacle" | "time" | "finish" };

export class Phase1Snake3D implements IScene {
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  private snakeMat: THREE.MeshStandardMaterial;
  private foodMesh!: THREE.Mesh;
  private segments: THREE.Mesh[] = [];
  private body: { x: number; z: number }[] = [];
  private dir: Dir = { x: 1, z: 0 };
  private nextDir: Dir = { x: 1, z: 0 };
  private foodPos = { x: 5, z: 5 };
  private obstacles: { x: number; z: number }[] = [];
  private tickAcc = 0;
  private tickRate = 0.28;
  score = 0;
  timeElapsed = 0;
  paused = true;
  ended = false;
  private gameStarted = false;
  onHud?: (s: { score: number; length: number; timeElapsed: number }) => void;
  onEnd?: (r: Phase1Result) => void;
  private disposeFns: Array<() => void> = [];

  constructor(w: number, h: number) {
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
    this.camera.position.set(GRID / 2, 22, GRID + 8);
    this.camera.lookAt(GRID / 2, 0, GRID / 2);

    this.scene.background = new THREE.Color("#e8c98a");
    this.scene.fog = new THREE.Fog("#e8c98a", 30, 80);

    this.scene.add(new THREE.AmbientLight(0xffe1b0, 0.8));
    const sun = new THREE.DirectionalLight(0xfff1cc, 1.2);
    sun.position.set(10, 20, 10);
    this.scene.add(sun);

    // Terreno: areia rachada via canvas
    const texCanvas = document.createElement("canvas");
    texCanvas.width = texCanvas.height = 256;
    const tctx = texCanvas.getContext("2d")!;
    tctx.fillStyle = "#d4a85a";
    tctx.fillRect(0, 0, 256, 256);
    tctx.strokeStyle = "rgba(60,30,10,0.5)";
    tctx.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
      tctx.beginPath();
      tctx.moveTo(Math.random() * 256, Math.random() * 256);
      for (let j = 0; j < 4; j++) {
        tctx.lineTo(Math.random() * 256, Math.random() * 256);
      }
      tctx.stroke();
    }
    const tex = new THREE.CanvasTexture(texCanvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    const groundMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(GRID, GRID), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(GRID / 2 - 0.5, 0, GRID / 2 - 0.5);
    this.scene.add(ground);
    this.disposeFns.push(() => { tex.dispose(); ground.geometry.dispose(); groundMat.dispose(); });

    // Bordas (visuais)
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x8b6914 });
    for (let i = 0; i < 4; i++) {
      const isHor = i < 2;
      const geo = new THREE.BoxGeometry(isHor ? GRID + 1 : 0.3, 0.5, isHor ? 0.3 : GRID + 1);
      const m = new THREE.Mesh(geo, borderMat);
      m.position.set(
        i === 0 ? GRID / 2 - 0.5 : i === 1 ? GRID / 2 - 0.5 : i === 2 ? -0.65 : GRID - 0.35,
        0.25,
        i === 0 ? -0.65 : i === 1 ? GRID - 0.35 : GRID / 2 - 0.5,
      );
      this.scene.add(m);
      this.disposeFns.push(() => geo.dispose());
    }
    this.disposeFns.push(() => borderMat.dispose());

    // Mandacarus como obstáculos
    const obsMat = new THREE.MeshStandardMaterial({ color: 0x3d6b2a });
    for (let i = 0; i < 5; i++) {
      let x: number, z: number;
      do {
        x = Math.floor(Math.random() * GRID);
        z = Math.floor(Math.random() * GRID);
      } while ((x >= 4 && x <= 6 && z >= 9 && z <= 11) || this.obstacles.some((o) => o.x === x && o.z === z));
      this.obstacles.push({ x, z });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.6, 8), obsMat);
      trunk.position.set(x, 0.8, z);
      this.scene.add(trunk);
      this.disposeFns.push(() => trunk.geometry.dispose());
    }
    this.disposeFns.push(() => obsMat.dispose());

    // Snake
    this.snakeMat = new THREE.MeshStandardMaterial({ color: 0xf5e6c8, emissive: 0x332200, roughness: 0.5 });
    this.body = [
      { x: 5, z: 10 },
      { x: 4, z: 10 },
      { x: 3, z: 10 },
    ];
    this.body.forEach(() => this.addSegmentMesh());

    // Food
    const foodMat = new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0xff6600, emissiveIntensity: 0.8 });
    this.foodMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), foodMat);
    this.scene.add(this.foodMesh);
    this.disposeFns.push(() => { this.foodMesh.geometry.dispose(); foodMat.dispose(); });
    this.spawnFood();
    this.syncMeshes();
  }

  start() {
    this.gameStarted = true;
    this.paused = false;
  }

  private addSegmentMesh() {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), this.snakeMat);
    m.position.y = 0.45;
    this.scene.add(m);
    this.segments.push(m);
  }

  private syncMeshes() {
    while (this.segments.length < this.body.length) this.addSegmentMesh();
    while (this.segments.length > this.body.length) {
      const m = this.segments.pop()!;
      this.scene.remove(m);
    }
    this.body.forEach((p, i) => this.segments[i].position.set(p.x, 0.45, p.z));
    this.foodMesh.position.set(this.foodPos.x, 0.4, this.foodPos.z);
  }

  private spawnFood() {
    let x: number, z: number;
    let tries = 0;
    do {
      x = Math.floor(Math.random() * GRID);
      z = Math.floor(Math.random() * GRID);
      tries++;
    } while (
      tries < 200 &&
      (this.body.some((b) => b.x === x && b.z === z) || this.obstacles.some((o) => o.x === x && o.z === z))
    );
    this.foodPos = { x, z };
  }

  onKeyDown(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    const set = (x: number, z: number) => {
      if (this.dir.x === -x && this.dir.z === -z) return;
      this.nextDir = { x, z };
    };
    if (k === "arrowup" || k === "w") set(0, -1);
    else if (k === "arrowdown" || k === "s") set(0, 1);
    else if (k === "arrowleft" || k === "a") set(-1, 0);
    else if (k === "arrowright" || k === "d") set(1, 0);
  }

  setDirection(d: "up" | "down" | "left" | "right") {
    if (!this.gameStarted) return;
    if (d === "up") this.onKeyDown({ key: "ArrowUp" } as KeyboardEvent);
    if (d === "down") this.onKeyDown({ key: "ArrowDown" } as KeyboardEvent);
    if (d === "left") this.onKeyDown({ key: "ArrowLeft" } as KeyboardEvent);
    if (d === "right") this.onKeyDown({ key: "ArrowRight" } as KeyboardEvent);
  }

  onResize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private end(reason: Phase1Result["reason"]) {
    if (this.ended) return;
    this.ended = true;
    audio.sfxGameOver();
    this.onEnd?.({ score: this.score, length: this.body.length, timeElapsed: Math.min(300, Math.floor(this.timeElapsed)), reason });
  }

  update(dt: number) {
    if (this.paused || this.ended || !this.gameStarted) return;
    this.timeElapsed += dt;
    if (this.timeElapsed >= 300) {
      this.timeElapsed = 300;
      this.end("time");
      return;
    }
    this.tickAcc += dt;
    if (this.tickAcc >= this.tickRate) {
      this.tickAcc = 0;
      this.dir = this.nextDir;
      const head = this.body[0];
      const nx = head.x + this.dir.x;
      const nz = head.z + this.dir.z;
      if (nx < 0 || nx >= GRID || nz < 0 || nz >= GRID) return this.end("wall");
      if (this.body.some((b) => b.x === nx && b.z === nz)) return this.end("self");
      if (this.obstacles.some((o) => o.x === nx && o.z === nz)) return this.end("obstacle");
      this.body.unshift({ x: nx, z: nz });
      if (nx === this.foodPos.x && nz === this.foodPos.z) {
        this.score += 10;
        audio.sfxEat();
        this.tickRate = Math.max(0.12, this.tickRate * 0.97);
        this.spawnFood();
      } else {
        this.body.pop();
      }
      this.syncMeshes();
      this.onHud?.({ score: this.score, length: this.body.length, timeElapsed: Math.min(300, Math.floor(this.timeElapsed)) });
    }
    // pulse food
    const s = 1 + Math.sin(performance.now() * 0.005) * 0.1;
    this.foodMesh.scale.setScalar(s);
  }

  dispose() {
    this.snakeMat.dispose();
    this.segments.forEach((m) => { m.geometry.dispose(); this.scene.remove(m); });
    this.disposeFns.forEach((f) => f());
  }
}

export { GRID };
