type Dir = "up" | "down" | "left" | "right" | "none";
type Props = { onDir: (d: Dir) => void };

export function Phase3Pad({ onDir }: Props) {
  const mk = (d: Exclude<Dir, "none">, label: string, cls: string) => (
    <button
      className={`dpad-btn ${cls}`}
      onPointerDown={(e) => { e.preventDefault(); onDir(d); }}
      onPointerUp={() => onDir("none")}
      onPointerLeave={() => onDir("none")}
      aria-label={label}
    >
      {label}
    </button>
  );
  return (
    <div className="dpad" aria-label="Controle direcional">
      {mk("up", "▲", "up")}
      {mk("left", "◀", "left")}
      {mk("right", "▶", "right")}
      {mk("down", "▼", "down")}
    </div>
  );
}
