import { CrosswordPuzzle, WordSearchPuzzle, SudokuPuzzle, SoletraPuzzle, GameType } from '@/types';

/**
 * Gera o slug a partir do titulo
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por hifen
    .replace(/^-+|-+$/g, ''); // Remove hifens do inicio e fim
}

/**
 * Formata o JSON para exportacao (compatível com coquetel-online)
 * - Cruzadas: array com 1 elemento (formato esperado)
 * - Caça-palavras: objeto único
 * - Sudoku: objeto único
 */
export function formatPuzzleForExport(
  puzzle: CrosswordPuzzle | WordSearchPuzzle | SudokuPuzzle | SoletraPuzzle,
  gameType: GameType,
  isFree: boolean = false
): string {
  if (gameType === 'crossword') {
    // Cruzadas: coquetel-online espera um array com o puzzle
    return JSON.stringify([puzzle], null, 2);
  } else {
    // Caça-palavras, Sudoku e Soletra: objeto único
    return JSON.stringify(puzzle, null, 2);
  }
}

/**
 * Faz download do arquivo JSON
 */
export function downloadJson(
  puzzle: CrosswordPuzzle | WordSearchPuzzle | SudokuPuzzle | SoletraPuzzle,
  gameType: GameType,
  filename: string,
  isFree: boolean = false
): void {
  const jsonString = formatPuzzleForExport(puzzle, gameType, isFree);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copia JSON para clipboard
 */
export async function copyJsonToClipboard(
  puzzle: CrosswordPuzzle | WordSearchPuzzle | SudokuPuzzle | SoletraPuzzle,
  gameType: GameType,
  isFree: boolean = false
): Promise<boolean> {
  try {
    const jsonString = formatPuzzleForExport(puzzle, gameType, isFree);
    await navigator.clipboard.writeText(jsonString);
    return true;
  } catch (error) {
    console.error('Erro ao copiar para clipboard:', error);
    return false;
  }
}
