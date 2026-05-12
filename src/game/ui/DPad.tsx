type Props = {
  onDir: (d: "up" | "down" | "left" | "right") => void;
};
export function DPad({ onDir }: Props) {
  const mk = (d: "up" | "down" | "left" | "right", label: string, cls: string) => (
    <button
      className={`dpad-btn ${cls}`}
      onPointerDown={(e) => { e.preventDefault(); onDir(d); }}
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
