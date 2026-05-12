const KEY = "repteis-caatinga:progress";

export type PhaseRecord = { stars: number; score: number; done: boolean };
export type Progress = {
  fase1: PhaseRecord | null;
  fase2: PhaseRecord | null;
  fase3: PhaseRecord | null;
  muted: boolean;
};

const empty: Progress = { fase1: null, fase2: null, fase3: null, muted: false };

export function loadProgress(): Progress {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

export function saveProgress(p: Progress) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function recordPhase(phase: 1 | 2 | 3, stars: number, score = 0): Progress {
  const p = loadProgress();
  const key = `fase${phase}` as const;
  const prev = p[key];
  p[key] = {
    stars: Math.max(prev?.stars ?? 0, stars),
    score: Math.max(prev?.score ?? 0, score),
    done: true,
  };
  saveProgress(p);
  return p;
}

export function totalScore(p: Progress): number {
  return (p.fase1?.score ?? 0) + (p.fase2?.score ?? 0) + (p.fase3?.score ?? 0);
}

export function allPhasesDone(p: Progress): boolean {
  return !!(p.fase1?.done && p.fase2?.done && p.fase3?.done);
}

export function resetProgress(): Progress {
  const reset = { fase1: null, fase2: null, fase3: null, muted: false };
  saveProgress(reset);
  return reset;
}
