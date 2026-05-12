import * as THREE from "three";
import type { IScene } from "../engine/types";

export class MenuScene3D implements IScene {
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  private mandacarus: THREE.Group;
  private moon: THREE.Mesh;
  private starsMat: THREE.PointsMaterial;
  private disposeFns: Array<() => void> = [];

  constructor(w: number, h: number) {
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500);
    this.camera.position.set(0, 6, 22);

    // Sépia noturno
    this.scene.background = new THREE.Color("#0a0805");
    this.scene.fog = new THREE.Fog("#0a0805", 30, 90);

    // Estrelas
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      const r = 80 + Math.random() * 40;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1) * 0.6;
      positions[i * 3] = r * Math.sin(p) * Math.cos(t);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(p)) + 5;
      positions[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.starsMat = new THREE.PointsMaterial({ color: 0xfff2c0, size: 0.6, sizeAttenuation: true });
    const stars = new THREE.Points(starGeo, this.starsMat);
    this.scene.add(stars);
    this.disposeFns.push(() => starGeo.dispose());

    // Lua crescente (2 esferas: clara + corte)
    const moonGeo = new THREE.SphereGeometry(3, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
    this.moon = new THREE.Mesh(moonGeo, moonMat);
    this.moon.position.set(-15, 18, -30);
    this.scene.add(this.moon);
    const cutGeo = new THREE.SphereGeometry(3.05, 32, 32);
    const cutMat = new THREE.MeshBasicMaterial({ color: 0x0a0805 });
    const cut = new THREE.Mesh(cutGeo, cutMat);
    cut.position.set(-13.8, 18.4, -29);
    this.scene.add(cut);
    this.disposeFns.push(() => { moonGeo.dispose(); moonMat.dispose(); cutGeo.dispose(); cutMat.dispose(); });

    // Halo (sprite)
    const haloCanvas = document.createElement("canvas");
    haloCanvas.width = haloCanvas.height = 128;
    const cctx = haloCanvas.getContext("2d")!;
    const grd = cctx.createRadialGradient(64, 64, 8, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,242,192,0.6)");
    grd.addColorStop(1, "rgba(255,242,192,0)");
    cctx.fillStyle = grd;
    cctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(haloCanvas);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    halo.scale.set(14, 14, 1);
    halo.position.copy(this.moon.position);
    this.scene.add(halo);
    this.disposeFns.push(() => tex.dispose());

    // Chão
    const groundGeo = new THREE.PlaneGeometry(200, 200, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    this.scene.add(ground);
    this.disposeFns.push(() => { groundGeo.dispose(); groundMat.dispose(); });

    // Mandacarus
    this.mandacarus = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const m = makeMandacaru();
      const a = (i / 12) * Math.PI * 2;
      const r = 14 + Math.random() * 10;
      m.position.set(Math.cos(a) * r, -2, Math.sin(a) * r - 5);
      m.rotation.y = Math.random() * Math.PI * 2;
      m.scale.setScalar(0.7 + Math.random() * 0.8);
      this.mandacarus.add(m);
    }
    this.scene.add(this.mandacarus);

    // Luzes
    const amb = new THREE.AmbientLight(0x6a5a3a, 0.6);
    this.scene.add(amb);
    const moonLight = new THREE.DirectionalLight(0xbcd4ff, 0.7);
    moonLight.position.set(-15, 18, -10);
    this.scene.add(moonLight);
  }

  update(_dt: number, elapsed: number) {
    const r = 22;
    this.camera.position.x = Math.sin(elapsed * 0.08) * r;
    this.camera.position.z = Math.cos(elapsed * 0.08) * r;
    this.camera.position.y = 6 + Math.sin(elapsed * 0.2) * 0.5;
    this.camera.lookAt(0, 4, 0);
    this.starsMat.size = 0.55 + Math.sin(elapsed * 2) * 0.1;
  }

  onResize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.mandacarus.traverse((o) => {
      if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose();
      const m = (o as THREE.Mesh).material;
      if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
      else if (m) m.dispose();
    });
    this.disposeFns.forEach((f) => f());
  }
}

function makeMandacaru(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3d6b2a, roughness: 0.8 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 4, 8), mat);
  trunk.position.y = 2;
  g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.8, 8), mat);
    arm.position.y = 2 + i * 0.8;
    arm.position.x = (i % 2 === 0 ? 0.6 : -0.6);
    arm.rotation.z = (i % 2 === 0 ? -0.5 : 0.5);
    g.add(arm);
  }
  return g;
}
