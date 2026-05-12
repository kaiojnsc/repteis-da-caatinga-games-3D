type Props = {
  onJump: () => void;
  onLeft: (down: boolean) => void;
  onRight: (down: boolean) => void;
};
export function JumpPad({ onJump, onLeft, onRight }: Props) {
  return (
    <div className="jumppad" aria-label="Controles">
      <div className="jumppad-left">
        <button
          className="dpad-btn"
          aria-label="Esquerda"
          onPointerDown={(e) => { e.preventDefault(); onLeft(true); }}
          onPointerUp={() => onLeft(false)}
          onPointerLeave={() => onLeft(false)}
        >◀</button>
        <button
          className="dpad-btn"
          aria-label="Direita"
          onPointerDown={(e) => { e.preventDefault(); onRight(true); }}
          onPointerUp={() => onRight(false)}
          onPointerLeave={() => onRight(false)}
        >▶</button>
      </div>
      <button
        className="dpad-btn jumppad-jump"
        aria-label="Pular"
        onPointerDown={(e) => { e.preventDefault(); onJump(); }}
      >PULAR</button>
    </div>
  );
}
