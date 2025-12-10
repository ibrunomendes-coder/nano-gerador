import { WordSearchPuzzle, GeneratedWord, GridConfig } from '@/types';

type Direction = [number, number];

// Direções válidas para caça-palavras:
// - Horizontal: esquerda para direita (dx=1, dy=0)
// - Vertical: cima para baixo (dx=0, dy=1)
// - Diagonal: baixo-direita (dx=1, dy=1) e baixo-esquerda (dx=-1, dy=1)
// Nota: [dy, dx] - primeiro é a direção Y (linha), segundo é X (coluna)
const DIRECTIONS: Direction[] = [
  [0, 1],   // horizontal: esquerda para direita
  [1, 0],   // vertical: cima para baixo
  [1, 1],   // diagonal: baixo-direita
  [1, -1],  // diagonal: baixo-esquerda
];

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Gera um caça-palavras
 */
export function generateWordSearch(
  words: GeneratedWord[],
  config: GridConfig,
  description: string,
  title: string
): WordSearchPuzzle {
  const { width, height } = config;
  const selectedWords = words.filter(w => w.selected).map(w => w.word);

  // Cria a grade vazia
  const grid: string[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(''));

  // Grade de resposta (mostra onde estão as palavras)
  const answerGrid: string[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill('-'));

  // Tenta posicionar cada palavra
  const placedWords: string[] = [];

  for (const word of selectedWords) {
    const placed = placeWord(grid, answerGrid, word, width, height);
    if (placed) {
      placedWords.push(word);
    }
  }

  // Preenche espaços vazios com letras aleatórias
  fillEmptySpaces(grid, width, height);

  // Converte para formato de string
  const content = grid.map(row => row.join(' '));
  const answer = answerGrid.map(row => row.join(' '));

  return {
    name: title,
    description,
    content,
    answer,
    suggestions: placedWords,
  };
}

function placeWord(
  grid: string[][],
  answerGrid: string[][],
  word: string,
  width: number,
  height: number
): boolean {
  // Tenta até 100 vezes posicionar a palavra
  for (let attempt = 0; attempt < 100; attempt++) {
    const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const [dy, dx] = direction;

    // Calcula posição inicial válida baseada na direção
    let startX: number, startY: number;

    // Para X:
    // dx=1 (direita): começa da esquerda, precisa de espaço à direita
    // dx=-1 (esquerda): começa mais à direita, vai para esquerda
    // dx=0: qualquer coluna
    if (dx === 1) {
      // Horizontal direita ou diagonal baixo-direita: começa à esquerda
      startX = Math.floor(Math.random() * (width - word.length + 1));
    } else if (dx === -1) {
      // Diagonal baixo-esquerda: começa mais à direita (mínimo word.length-1)
      startX = word.length - 1 + Math.floor(Math.random() * (width - word.length + 1));
    } else {
      // Vertical: qualquer coluna
      startX = Math.floor(Math.random() * width);
    }

    // Para Y:
    // dy=1 (baixo): começa de cima, precisa de espaço abaixo
    // dy=0: qualquer linha
    if (dy === 1) {
      // Vertical ou diagonal: começa de cima
      startY = Math.floor(Math.random() * (height - word.length + 1));
    } else {
      // Horizontal: qualquer linha
      startY = Math.floor(Math.random() * height);
    }

    // Verifica se a palavra cabe
    if (canPlaceWord(grid, word, startX, startY, dx, dy, width, height)) {
      // Coloca a palavra
      for (let i = 0; i < word.length; i++) {
        const x = startX + i * dx;
        const y = startY + i * dy;
        grid[y][x] = word[i];
        answerGrid[y][x] = word[i];
      }
      return true;
    }
  }

  return false;
}

function canPlaceWord(
  grid: string[][],
  word: string,
  startX: number,
  startY: number,
  dx: number,
  dy: number,
  width: number,
  height: number
): boolean {
  for (let i = 0; i < word.length; i++) {
    const x = startX + i * dx;
    const y = startY + i * dy;

    // Verifica limites
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return false;
    }

    // Verifica se célula está vazia ou tem a mesma letra
    if (grid[y][x] !== '' && grid[y][x] !== word[i]) {
      return false;
    }
  }

  return true;
}

function fillEmptySpaces(grid: string[][], width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === '') {
        grid[y][x] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      }
    }
  }
}

/**
 * Valida um caça-palavras
 */
export function validateWordSearch(puzzle: WordSearchPuzzle): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!puzzle.name) {
    errors.push('Nome/título é obrigatório');
  }

  if (!puzzle.description) {
    errors.push('Descrição é obrigatória');
  }

  if (puzzle.suggestions.length === 0) {
    errors.push('Deve ter pelo menos uma palavra');
  }

  if (puzzle.content.length === 0) {
    errors.push('Grade não pode estar vazia');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
