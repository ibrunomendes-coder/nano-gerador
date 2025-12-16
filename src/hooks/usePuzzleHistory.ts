'use client';

import { useState, useEffect, useCallback } from 'react';
import { PuzzleHistoryItem, GameType, Difficulty, CrosswordPuzzle, WordSearchPuzzle, SudokuPuzzle, SoletraPuzzle } from '@/types';

const STORAGE_KEY = 'nano-gerador-history';

export function usePuzzleHistory() {
  const [history, setHistory] = useState<PuzzleHistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega do localStorage na montagem
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ordena por data de criação (mais recente primeiro)
        const sorted = parsed.sort((a: PuzzleHistoryItem, b: PuzzleHistoryItem) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setHistory(sorted);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
    setIsLoaded(true);
  }, []);

  // Salva no localStorage quando muda
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch (error) {
        console.error('Erro ao salvar histórico:', error);
      }
    }
  }, [history, isLoaded]);

  // Gera ID único
  const generateId = useCallback(() => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `${timestamp}-${random}`;
  }, []);

  // Adiciona item ao histórico
  const addToHistory = useCallback(
    (
      puzzle: CrosswordPuzzle | WordSearchPuzzle | SudokuPuzzle | SoletraPuzzle,
      gameType: GameType,
      difficulty: Difficulty,
      title: string,
      theme: string
    ) => {
      let wordCount = 0;
      if (gameType === 'crossword') {
        wordCount = (puzzle as CrosswordPuzzle).word?.length || 0;
      } else if (gameType === 'wordsearch') {
        wordCount = (puzzle as WordSearchPuzzle).suggestions?.length || 0;
      } else if (gameType === 'sudoku') {
        wordCount = (puzzle as SudokuPuzzle).clueCount || 0;
      } else if (gameType === 'soletra') {
        wordCount = (puzzle as SoletraPuzzle).validWords?.length || 0;
      }

      const newItem: PuzzleHistoryItem = {
        id: generateId(),
        title,
        gameType,
        difficulty,
        theme,
        wordCount,
        createdAt: new Date().toISOString(),
        isTested: false,
        isPublished: false,
        puzzle,
      };

      setHistory((prev) => [newItem, ...prev]);
      return newItem.id;
    },
    [generateId]
  );

  // Atualiza item
  const updateItem = useCallback(
    (id: string, updates: Partial<PuzzleHistoryItem>) => {
      setHistory((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    },
    []
  );

  // Remove item
  const deleteItem = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Busca item por ID
  const getItem = useCallback(
    (id: string) => {
      return history.find((item) => item.id === id);
    },
    [history]
  );

  // Limpa todo o histórico
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Estatísticas
  const stats = {
    total: history.length,
    tested: history.filter((i) => i.isTested).length,
    published: history.filter((i) => i.isPublished).length,
    crosswords: history.filter((i) => i.gameType === 'crossword').length,
    wordsearches: history.filter((i) => i.gameType === 'wordsearch').length,
    sudokus: history.filter((i) => i.gameType === 'sudoku').length,
    soletras: history.filter((i) => i.gameType === 'soletra').length,
  };

  return {
    history,
    isLoaded,
    addToHistory,
    updateItem,
    deleteItem,
    getItem,
    clearHistory,
    stats,
  };
}
