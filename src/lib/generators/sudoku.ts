import { SudokuPuzzle, Difficulty, SudokuCell, GRID_CONFIGS } from '@/types';

/**
 * Gerador de Sudoku
 *
 * Algoritmo:
 * 1. Gera uma solução completa válida usando backtracking
 * 2. Remove números baseado na dificuldade
 * 3. Verifica que o puzzle tem solução única
 */

type Grid = number[][];

// ============================================
// Geração de solução completa
// ============================================

/**
 * Gera uma grade 9x9 vazia
 */
function createEmptyGrid(): Grid {
  return Array(9)
    .fill(null)
    .map(() => Array(9).fill(0));
}

/**
 * Verifica se um número pode ser colocado em uma posição
 */
function isValid(grid: Grid, row: number, col: number, num: number): boolean {
  // Verifica linha
  for (let x = 0; x < 9; x++) {
    if (grid[row][x] === num) return false;
  }

  // Verifica coluna
  for (let y = 0; y < 9; y++) {
    if (grid[y][col] === num) return false;
  }

  // Verifica quadrante 3x3
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let y = boxRow; y < boxRow + 3; y++) {
    for (let x = boxCol; x < boxCol + 3; x++) {
      if (grid[y][x] === num) return false;
    }
  }

  return true;
}

/**
 * Encontra a próxima célula vazia
 */
function findEmpty(grid: Grid): [number, number] | null {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        return [row, col];
      }
    }
  }
  return null;
}

/**
 * Resolve o Sudoku usando backtracking
 */
function solve(grid: Grid): boolean {
  const empty = findEmpty(grid);
  if (!empty) return true; // Todas as células preenchidas

  const [row, col] = empty;

  // Tenta números de 1 a 9 em ordem aleatória
  const numbers = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  for (const num of numbers) {
    if (isValid(grid, row, col, num)) {
      grid[row][col] = num;

      if (solve(grid)) {
        return true;
      }

      grid[row][col] = 0; // Backtrack
    }
  }

  return false;
}

/**
 * Embaralha um array (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Gera uma solução completa de Sudoku
 */
function generateSolution(): Grid {
  const grid = createEmptyGrid();
  solve(grid);
  return grid;
}

// ============================================
// Remoção de números (criação do puzzle)
// ============================================

/**
 * Conta quantas soluções o puzzle tem (limitado a 2 para eficiência)
 */
function countSolutions(grid: Grid, limit: number = 2): number {
  const gridCopy = grid.map((row) => [...row]);
  let count = 0;

  function solveCount(): boolean {
    if (count >= limit) return true; // Limite atingido

    const empty = findEmpty(gridCopy);
    if (!empty) {
      count++;
      return count >= limit;
    }

    const [row, col] = empty;

    for (let num = 1; num <= 9; num++) {
      if (isValid(gridCopy, row, col, num)) {
        gridCopy[row][col] = num;
        if (solveCount()) return true;
        gridCopy[row][col] = 0;
      }
    }

    return false;
  }

  solveCount();
  return count;
}

/**
 * Remove números do puzzle mantendo solução única
 */
function removeNumbers(
  solution: Grid,
  targetClues: number
): { puzzle: SudokuCell[][]; actualClues: number } {
  // Copia a solução
  const puzzle: SudokuCell[][] = solution.map((row) => [...row]);

  // Lista de todas as posições
  const positions: [number, number][] = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      positions.push([row, col]);
    }
  }

  // Embaralha posições para remoção aleatória
  const shuffledPositions = shuffleArray(positions);

  let currentClues = 81;
  let attempts = 0;
  const maxAttempts = 100;

  for (const [row, col] of shuffledPositions) {
    if (currentClues <= targetClues || attempts >= maxAttempts) break;

    const backup = puzzle[row][col];
    if (backup === null) continue; // Já removido

    // Remove o número temporariamente
    puzzle[row][col] = null;

    // Cria grid para verificar soluções
    const testGrid = puzzle.map((r) =>
      r.map((cell) => (cell === null ? 0 : cell))
    );

    // Verifica se ainda tem solução única
    const solutions = countSolutions(testGrid);

    if (solutions === 1) {
      currentClues--;
    } else {
      // Restaura se não tem solução única
      puzzle[row][col] = backup;
      attempts++;
    }
  }

  return { puzzle, actualClues: currentClues };
}

// ============================================
// Interface pública
// ============================================

/**
 * Gera um puzzle de Sudoku
 */
export function generateSudoku(difficulty: Difficulty, title: string): SudokuPuzzle {
  const config = GRID_CONFIGS.sudoku[difficulty];
  const targetClues = Math.floor((config.minWords + config.maxWords) / 2);

  // Gera solução completa
  const solution = generateSolution();

  // Remove números para criar o puzzle
  const { puzzle, actualClues } = removeNumbers(solution, targetClues);

  return {
    name: title,
    difficulty,
    grid: puzzle,
    solution,
    clueCount: actualClues,
  };
}

/**
 * Valida um puzzle de Sudoku
 */
export function validateSudoku(
  puzzle: SudokuPuzzle
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!puzzle.name) {
    errors.push('Nome/título é obrigatório');
  }

  if (puzzle.grid.length !== 9) {
    errors.push('Grade deve ter 9 linhas');
  }

  if (puzzle.solution.length !== 9) {
    errors.push('Solução deve ter 9 linhas');
  }

  // Verifica se a solução é válida
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const num = puzzle.solution[row][col];
      if (num < 1 || num > 9) {
        errors.push(`Número inválido na solução: ${num}`);
      }
    }
  }

  // Verifica que as pistas no puzzle correspondem à solução
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const puzzleCell = puzzle.grid[row][col];
      const solutionCell = puzzle.solution[row][col];
      if (puzzleCell !== null && puzzleCell !== solutionCell) {
        errors.push(`Pista não corresponde à solução em [${row},${col}]`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Verifica se uma tentativa do usuário está correta
 */
export function checkSolution(
  puzzle: SudokuPuzzle,
  userGrid: number[][]
): { correct: boolean; incorrectCells: [number, number][] } {
  const incorrectCells: [number, number][] = [];

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (userGrid[row][col] !== puzzle.solution[row][col]) {
        incorrectCells.push([row, col]);
      }
    }
  }

  return {
    correct: incorrectCells.length === 0,
    incorrectCells,
  };
}
