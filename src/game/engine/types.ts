import * as THREE from "three";

export interface IScene {
  scene: THREE.Scene;
  camera: THREE.Camera;
  update: (dt: number, elapsed: number) => void;
  onResize?: (w: number, h: number) => void;
  onPointerMove?: (x: number, y: number) => void;
  onPointerDown?: (x: number, y: number) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  onKeyUp?: (e: KeyboardEvent) => void;
  dispose: () => void;
}
