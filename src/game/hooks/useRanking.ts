import { useCallback, useEffect, useState } from "react";

const KEY = "caatinga_ranking";

export type RankingEntry = {
  nome: string;
  pontuacao: number;
  data: string;
};

function read(): RankingEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as RankingEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(list: RankingEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/**
 * Ranking persistido em localStorage. A função `save` é o ponto único
 * de persistência — bastará trocá-la por uma chamada Firebase no futuro.
 */
export function useRanking() {
  const [entries, setEntries] = useState<RankingEntry[]>([]);

  useEffect(() => {
    setEntries(read());
  }, []);

  const save = useCallback((nome: string, pontuacao: number) => {
    const clean = (nome || "Anônimo").trim().slice(0, 20) || "Anônimo";
    const entry: RankingEntry = {
      nome: clean,
      pontuacao,
      data: new Date().toLocaleDateString("pt-BR"),
    };
    const next = [...read(), entry].sort((a, b) => b.pontuacao - a.pontuacao).slice(0, 50);
    write(next);
    setEntries(next);
    return entry;
  }, []);

  const top5 = entries.slice(0, 5);
  return { entries, top5, save };
}
