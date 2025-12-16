// ============================================
// Tipos para o Gerador de Passatempos
// ============================================

export type GameType = 'crossword' | 'wordsearch' | 'sudoku' | 'soletra';
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
  sudoku: {
    // Sudoku é sempre 9x9, a dificuldade define quantas células são reveladas
    // Easy: ~35-40 pistas (41-46 vazias)
    easy: { width: 9, height: 9, minWords: 35, maxWords: 40, estimatedTime: 8 },
    // Medium: ~28-34 pistas (47-53 vazias)
    medium: { width: 9, height: 9, minWords: 28, maxWords: 34, estimatedTime: 15 },
    // Hard: ~22-27 pistas (54-59 vazias)
    hard: { width: 9, height: 9, minWords: 22, maxWords: 27, estimatedTime: 25 },
  },
  soletra: {
    // Soletra: 7 letras (1 central + 6 ao redor), dificuldade define quantidade de palavras válidas
    // Easy: ~15-25 palavras válidas
    easy: { width: 7, height: 7, minWords: 15, maxWords: 25, estimatedTime: 5 },
    // Medium: ~25-40 palavras válidas
    medium: { width: 7, height: 7, minWords: 25, maxWords: 40, estimatedTime: 10 },
    // Hard: ~40-60+ palavras válidas
    hard: { width: 7, height: 7, minWords: 40, maxWords: 60, estimatedTime: 15 },
  },
};

// Labels em português
export const GAME_TYPE_LABELS: Record<GameType, string> = {
  crossword: 'Cruzadas',
  wordsearch: 'Caça-Palavras',
  sudoku: 'Sudoku',
  soletra: 'Soletra',
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
// Tipos para Sudoku
// ============================================

export type SudokuCell = number | null; // null = vazio, 1-9 = número

export interface SudokuPuzzle {
  name: string;
  difficulty: Difficulty;
  // Grade 9x9 do puzzle (com células vazias)
  grid: SudokuCell[][];
  // Solução completa
  solution: number[][];
  // Número de pistas (células preenchidas)
  clueCount: number;
}

// ============================================
// Tipos para Soletra (Spelling Bee)
// ============================================

export interface SoletraPuzzle {
  name: string;
  difficulty: Difficulty;
  // As 7 letras disponíveis
  letters: string[];
  // Letra central (obrigatória em todas as palavras)
  centerLetter: string;
  // Todas as palavras válidas que podem ser formadas
  validWords: string[];
  // Palavra(s) que usa todas as 7 letras (pangrama)
  pangrams: string[];
  // Pontuação máxima possível
  maxScore: number;
  // Níveis de pontuação (porcentagens do máximo)
  rankings: {
    beginner: number;    // Iniciante
    good: number;        // Bom
    great: number;       // Ótimo
    amazing: number;     // Incrível
    genius: number;      // Gênio
  };
}

// ============================================
// Resultado da geração
// ============================================

export interface GenerationResult {
  success: boolean;
  puzzle: CrosswordPuzzle | WordSearchPuzzle | SudokuPuzzle | SoletraPuzzle | null;
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
  puzzle: CrosswordPuzzle | WordSearchPuzzle | SudokuPuzzle | SoletraPuzzle;
}
