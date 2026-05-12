import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { IScene } from "./types";

type Props = {
  sceneRef: React.MutableRefObject<IScene | null>;
};

export function ThreeCanvas({ sceneRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute("aria-label", "Cena 3D do jogo");

    let raf = 0;
    let last = performance.now();
    const start = last;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const elapsed = (now - start) / 1000;
      const s = sceneRef.current;
      if (s) {
        s.update(dt, elapsed);
        renderer.render(s.scene, s.camera);
      }
    };
    loop();

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      sceneRef.current?.onResize?.(w, h);
    };
    window.addEventListener("resize", onResize);

    const rect = () => renderer.domElement.getBoundingClientRect();
    const onMove = (e: PointerEvent) => {
      const r = rect();
      sceneRef.current?.onPointerMove?.(e.clientX - r.left, e.clientY - r.top);
    };
    const onDown = (e: PointerEvent) => {
      const r = rect();
      sceneRef.current?.onPointerDown?.(e.clientX - r.left, e.clientY - r.top);
    };
    const onKey = (e: KeyboardEvent) => sceneRef.current?.onKeyDown?.(e);
    const onKeyUp = (e: KeyboardEvent) => sceneRef.current?.onKeyUp?.(e);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [sceneRef]);

  return <div ref={containerRef} className="three-container" />;
}
