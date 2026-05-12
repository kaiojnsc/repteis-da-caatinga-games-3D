import { useState, useEffect } from "react";

export function CordelLines({ lines, delay = 0.6, className = "" }: { lines: string[]; delay?: number; className?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    const timers: number[] = [];
    lines.forEach((_, i) => {
      timers.push(window.setTimeout(() => setShown((s) => Math.max(s, i + 1)), delay * 1000 * (i + 1)));
    });
    return () => timers.forEach(clearTimeout);
  }, [lines, delay]);
  return (
    <div className={`cordel ${className}`}>
      {lines.map((l, i) => (
        <p key={i} className={`cordel-line ${i < shown ? "is-shown" : ""}`}>{l}</p>
      ))}
    </div>
  );
}
