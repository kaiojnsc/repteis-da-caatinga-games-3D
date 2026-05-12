import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "caatinga_progress";

type PhaseProgress = { done: boolean; score: number };

type ProgressData = {
  phase1: PhaseProgress;
  phase2: PhaseProgress;
  phase3: PhaseProgress;
};

const DEFAULT_PROGRESS: ProgressData = {
  phase1: { done: true, score: 0 }, // Phase 1 começa desbloqueada
  phase2: { done: false, score: 0 },
  phase3: { done: false, score: 0 },
};

/**
 * Hook para gerenciar o desbloqueio de fases do jogo
 * Persiste no localStorage com chave "caatinga_progress"
 * Phase 1 começa desbloqueada por padrão
 */
export function useProgress() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar progresso do localStorage na inicialização
  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as any;
        if (parsed && typeof parsed.phase1_done !== "undefined") {
          // Migração / Invalidação de schema antigo
          const initial = { ...DEFAULT_PROGRESS };
          setProgress(initial);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        } else {
          setProgress(parsed as ProgressData);
        }
      } else {
        // Primeira vez - Phase 1 começa desbloqueada
        const initial = { ...DEFAULT_PROGRESS };
        setProgress(initial);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
    } catch (error) {
      console.warn("Erro ao carregar progresso:", error);
      const initial = { ...DEFAULT_PROGRESS };
      setProgress(initial);
    }

    setIsLoading(false);
  }, []);

  /**
   * Marca uma fase como completa e desbloqueia a próxima
   */
  const completePhase = useCallback((phase: 1 | 2 | 3, score: number = 0) => {
    setProgress((prev) => {
      if (!prev) return null;

      const updated = { ...prev };

      if (phase === 1) {
        updated.phase1 = { done: true, score: Math.max(updated.phase1.score, score) };
        updated.phase2 = { ...updated.phase2, done: true }; // Desbloqueia Phase 2
      } else if (phase === 2) {
        updated.phase2 = { done: true, score: Math.max(updated.phase2.score, score) };
        updated.phase3 = { ...updated.phase3, done: true }; // Desbloqueia Phase 3
      } else if (phase === 3) {
        updated.phase3 = { done: true, score: Math.max(updated.phase3.score, score) };
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn("Erro ao salvar progresso:", error);
      }

      return updated;
    });
  }, []);

  /**
   * Verifica se uma fase está desbloqueada
   */
  const isUnlocked = useCallback(
    (phase: 1 | 2 | 3): boolean => {
      if (!progress) return phase === 1; // Phase 1 sempre desbloqueada por padrão

      if (phase === 1) return true; // Phase 1 sempre desbloqueada
      if (phase === 2) return progress.phase1.done; // Phase 2 desbloqueada após Phase 1
      if (phase === 3) return progress.phase2.done; // Phase 3 desbloqueada após Phase 2

      return false;
    },
    [progress]
  );

  /**
   * Verifica se todas as fases foram completadas
   */
  const allComplete = useCallback((): boolean => {
    if (!progress || !progress.phase1 || !progress.phase2 || !progress.phase3) return false;
    return progress.phase1.done && progress.phase2.done && progress.phase3.done;
  }, [progress]);

  /**
   * Retorna a soma da pontuação de todas as fases
   */
  const getTotalScore = useCallback((): number => {
    if (!progress || !progress.phase1 || !progress.phase2 || !progress.phase3) return 0;
    return (progress.phase1.score || 0) + (progress.phase2.score || 0) + (progress.phase3.score || 0);
  }, [progress]);

  /**
   * Reseta o progresso (Phase 1 volta a estar desbloqueada)
   */
  const resetProgress = useCallback(() => {
    const reset = { ...DEFAULT_PROGRESS };
    setProgress(reset);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
    } catch (error) {
      console.warn("Erro ao resetar progresso:", error);
    }
  }, []);

  return {
    progress,
    isLoading,
    completePhase,
    isUnlocked,
    allComplete,
    getTotalScore,
    resetProgress,
  };
}
