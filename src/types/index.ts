// ============================================
// Tipos para o Gerador de Passatempos
// ============================================

export type GameType = 'crossword' | 'wordsearch';
export type Difficulty = 'easy' | 'medium' | 'hard';

// Configuração de grade por dificuldade
export interface GridConfig {
  width: number;
  height: number;
  minWords: number;
  maxWords: number;
  // Para cruzadas: número exato de palavras em cada direção
  horizontalWords?: number;
  verticalWords?: number;
  estimatedTime: number; // em minutos
}

// Configurações padrão por tipo de jogo e dificuldade
// Cruzadas: grades maiores para MAXIMIZAR palavras e MINIMIZAR blocos pretos
// Objetivo: densidade de letras > 90%, blocos pretos < 10%
// Referência: Desafio Mestre 13x13 tem 56 palavras com 8% de blocos
export const GRID_CONFIGS: Record<GameType, Record<Difficulty, GridConfig>> = {
  crossword: {
    // Easy: 9x9 = 81 células, ~12-16 palavras, múltiplas palavras por linha
    easy: { width: 9, height: 9, minWords: 12, maxWords: 16, horizontalWords: 7, verticalWords: 7, estimatedTime: 5 },
    // Medium: 13x13 = 169 células, ~30-40 palavras (similar Desafio Mestre)
    medium: { width: 13, height: 13, minWords: 30, maxWords: 40, horizontalWords: 18, verticalWords: 18, estimatedTime: 12 },
    // Hard: 17x17 = 289 células, ~50-65 palavras, alta densidade
    hard: { width: 17, height: 17, minWords: 50, maxWords: 65, horizontalWords: 30, verticalWords: 30, estimatedTime: 20 },
  },
  wordsearch: {
    easy: { width: 10, height: 10, minWords: 5, maxWords: 7, estimatedTime: 3 },
    medium: { width: 12, height: 12, minWords: 8, maxWords: 10, estimatedTime: 6 },
    hard: { width: 15, height: 15, minWords: 12, maxWords: 15, estimatedTime: 10 },
  },
};

// Labels em português
export const GAME_TYPE_LABELS: Record<GameType, string> = {
  crossword: 'Cruzadas',
  wordsearch: 'Caça-Palavras',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
};

// Estado do gerador
export interface GeneratorState {
  step: 'config' | 'generating' | 'preview' | 'approved';
  gameType: GameType;
  difficulty: Difficulty;
  theme: string;
  title: string;
  description: string;
  slug: string;
}

// Palavra gerada pelo Gemini
export interface GeneratedWord {
  word: string;
  clue: string; // para cruzadas
  selected: boolean;
}

// ============================================
// Tipos para Cruzadas (Crossword)
// ============================================

export interface CrosswordCell {
  x: string;
  y: string;
  solution?: string;
  type?: 'block';
}

export interface CrosswordWord {
  id: string;
  x: string;
  y: string;
}

export interface CrosswordClue {
  word: string;
  number: string;
  format: string;
  value: string;
}

export interface CrosswordClueGroup {
  title: 'Vertical' | 'Horizontal';
  clue: CrosswordClue[];
}

export interface CrosswordPuzzle {
  metadata: {
    title: string;
    creator: string;
    copyright: string;
    description: string;
  };
  grid: {
    width: number;
    height: number;
    cell: CrosswordCell[];
  };
  word: CrosswordWord[];
  clues: CrosswordClueGroup[];
}

// ============================================
// Tipos para Caça-Palavras (Word Search)
// ============================================

export interface WordSearchPuzzle {
  name: string;
  description: string;
  content: string[];  // grade de letras
  answer: string[];   // grade com palavras marcadas
  suggestions: string[]; // palavras a encontrar
}

// ============================================
// Resultado da geração
// ============================================

export interface GenerationResult {
  success: boolean;
  puzzle: CrosswordPuzzle | WordSearchPuzzle | null;
  words: GeneratedWord[];
  error?: string;
}

// ============================================
// Configuração de exportação
// ============================================

export interface ExportConfig {
  outputPath: string;
  filename: string;
  gameType: GameType;
  isFree: boolean;
}

// ============================================
// Histórico de Passatempos Gerados
// ============================================

export interface PuzzleHistoryItem {
  id: string;
  title: string;
  gameType: GameType;
  difficulty: Difficulty;
  theme: string;
  wordCount: number;
  createdAt: string; // ISO date string
  isTested: boolean;
  isPublished: boolean;
  puzzle: CrosswordPuzzle | WordSearchPuzzle;
}
