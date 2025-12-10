import {
  CrosswordPuzzle,
  CrosswordCell,
  CrosswordWord,
  CrosswordClue,
  CrosswordClueGroup,
  GeneratedWord,
  GridConfig,
} from '@/types';

interface PlacedWord {
  word: string;
  clue: string;
  x: number;
  y: number;
  direction: 'horizontal' | 'vertical';
  id: number;
}

interface Placement {
  x: number;
  y: number;
  direction: 'horizontal' | 'vertical';
  intersections: number;
}

/**
 * Gera uma cruzada DENSA - minimizando blocos pretos e maximizando interseções
 * Estratégia: múltiplas tentativas, prioriza densidade máxima
 */
export function generateCrossword(
  words: GeneratedWord[],
  config: GridConfig,
  description: string,
  title: string
): CrosswordPuzzle {
  const { width, height, horizontalWords = 5, verticalWords = 5 } = config;
  const targetTotal = horizontalWords + verticalWords;

  // Filtra palavras selecionadas
  const selectedWords = words
    .filter((w) => w.selected)
    .map((w) => ({ word: w.word.toUpperCase(), clue: w.clue }));

  // Ordena por tamanho DECRESCENTE - palavras maiores primeiro (mais oportunidades de interseção)
  const sortedByLength = [...selectedWords].sort((a, b) => b.word.length - a.word.length);

  // Tenta múltiplas vezes com diferentes ordenações - AUMENTADO para 10 tentativas
  let bestResult: { grid: (string | null)[][]; placedWords: PlacedWord[]; score: number } | null = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    // Estratégias diferentes de ordenação
    let wordsToTry: { word: string; clue: string }[];

    if (attempt === 0) {
      // Primeira: maiores primeiro
      wordsToTry = sortedByLength;
    } else if (attempt === 1) {
      // Segunda: menores primeiro (podem preencher espaços)
      wordsToTry = [...sortedByLength].reverse();
    } else if (attempt === 2) {
      // Terceira: alternando grandes e pequenas
      const half = Math.ceil(sortedByLength.length / 2);
      wordsToTry = [];
      for (let i = 0; i < half; i++) {
        if (sortedByLength[i]) wordsToTry.push(sortedByLength[i]);
        if (sortedByLength[sortedByLength.length - 1 - i]) {
          wordsToTry.push(sortedByLength[sortedByLength.length - 1 - i]);
        }
      }
    } else {
      // Restante: shuffle aleatório
      wordsToTry = [...sortedByLength].sort(() => Math.random() - 0.5);
    }

    const result = tryPlaceWords(wordsToTry, width, height, targetTotal);

    // Score = células preenchidas^2 + interseções * 5 (prioriza densidade)
    const filledCells = result.grid.flat().filter(c => c !== null).length;
    const intersectionScore = result.placedWords.reduce((acc, pw) => {
      return acc + countWordIntersections(result.grid, pw);
    }, 0);

    // Balanceamento H/V é CRÍTICO - penaliza fortemente desbalanceamento
    const hCount = result.placedWords.filter(p => p.direction === 'horizontal').length;
    const vCount = result.placedWords.filter(p => p.direction === 'vertical').length;
    const difference = Math.abs(hCount - vCount);

    // Bonus alto por balanceamento, penalidade por diferença
    const balanceBonus = Math.min(hCount, vCount) * 50; // Aumentado de 20 para 50
    const balancePenalty = difference * difference * 10; // Penalidade quadrática

    const score = (filledCells * filledCells) + (intersectionScore * 5) + balanceBonus - balancePenalty;

    if (!bestResult || score > bestResult.score) {
      bestResult = { ...result, score };
    }

    // Se conseguiu alta densidade (>85% preenchido), para
    const totalCells = width * height;
    const density = filledCells / totalCells;
    if (density > 0.85 && result.placedWords.length >= targetTotal * 0.8) {
      break;
    }
  }

  const { grid, placedWords } = bestResult!;

  // Log de resultado
  const hCount = placedWords.filter(p => p.direction === 'horizontal').length;
  const vCount = placedWords.filter(p => p.direction === 'vertical').length;
  const totalCells = width * height;
  const filledCells = grid.flat().filter(c => c !== null).length;
  const blockCells = totalCells - filledCells;
  const density = Math.round((filledCells / totalCells) * 100);

  console.log(`=== RESULTADO CRUZADA ===`);
  console.log(`Esperado: ${horizontalWords}H + ${verticalWords}V = ${targetTotal}`);
  console.log(`Obtido: ${hCount}H + ${vCount}V = ${hCount + vCount}`);
  console.log(`Células: ${filledCells} letras, ${blockCells} blocos`);
  console.log(`Densidade: ${density}% letras, ${100 - density}% blocos`);

  return buildCrosswordPuzzle(grid, placedWords, width, height, title, description);
}

/**
 * Tenta colocar palavras na grade
 * REGRA: Toda palavra (exceto a primeira) DEVE ter pelo menos uma interseção
 * Estratégia: múltiplas passagens, alternando direções para balancear
 */
function tryPlaceWords(
  wordsToPlace: { word: string; clue: string }[],
  width: number,
  height: number,
  targetTotal: number
): { grid: (string | null)[][]; placedWords: PlacedWord[] } {
  const grid: (string | null)[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(null));

  const placedWords: PlacedWord[] = [];
  const usedWords = new Set<string>();
  let wordId = 1;

  // Coloca primeira palavra no centro horizontalmente
  if (wordsToPlace.length > 0) {
    const firstWord = wordsToPlace[0];
    const startX = Math.floor((width - firstWord.word.length) / 2);
    const startY = Math.floor(height / 2);

    if (startX >= 0 && canPlaceWord(grid, firstWord.word, startX, startY, 'horizontal', width, height)) {
      placeWord(grid, firstWord.word, startX, startY, 'horizontal');
      placedWords.push({
        word: firstWord.word,
        clue: firstWord.clue,
        x: startX,
        y: startY,
        direction: 'horizontal',
        id: wordId++,
      });
      usedWords.add(firstWord.word);
    }
  }

  // Coloca segunda palavra cruzando a primeira (vertical)
  if (wordsToPlace.length > 1 && placedWords.length > 0) {
    const firstPlaced = placedWords[0];
    for (let i = 1; i < wordsToPlace.length; i++) {
      const wordData = wordsToPlace[i];
      if (usedWords.has(wordData.word)) continue;

      // Tenta colocar verticalmente cruzando a primeira palavra
      const allPlacements = findAllPlacements(grid, wordData.word, width, height);
      const verticalWithIntersection = allPlacements.filter(p => p.direction === 'vertical' && p.intersections > 0);

      if (verticalWithIntersection.length > 0) {
        // Prefere cruzar no meio da primeira palavra
        verticalWithIntersection.sort((a, b) => {
          const distA = Math.abs(a.x - (firstPlaced.x + Math.floor(firstPlaced.word.length / 2)));
          const distB = Math.abs(b.x - (firstPlaced.x + Math.floor(firstPlaced.word.length / 2)));
          return distA - distB;
        });

        const chosen = verticalWithIntersection[0];
        placeWord(grid, wordData.word, chosen.x, chosen.y, chosen.direction);
        placedWords.push({
          word: wordData.word,
          clue: wordData.clue,
          x: chosen.x,
          y: chosen.y,
          direction: chosen.direction,
          id: wordId++,
        });
        usedWords.add(wordData.word);
        break;
      }
    }
  }

  // Calcula quantas palavras de cada direção precisamos
  const targetH = Math.ceil(targetTotal / 2);
  const targetV = Math.floor(targetTotal / 2);

  // Coloca resto das palavras - OBRIGATÓRIO ter interseção
  // Faz MUITAS passagens (5) para maximizar preenchimento
  let lastPlacedCount = 0;
  let passes = 0;
  const maxPasses = 5;

  while (placedWords.length < targetTotal && passes < maxPasses) {
    passes++;
    lastPlacedCount = placedWords.length;

    // Conta direções atuais para FORÇAR balanceamento
    const hCount = placedWords.filter(p => p.direction === 'horizontal').length;
    const vCount = placedWords.filter(p => p.direction === 'vertical').length;

    // Determina qual direção PRECISA de mais palavras
    let requiredDirection: 'horizontal' | 'vertical' | null = null;
    if (hCount < targetH && vCount >= targetV) {
      requiredDirection = 'horizontal'; // Precisa de mais horizontais
    } else if (vCount < targetV && hCount >= targetH) {
      requiredDirection = 'vertical'; // Precisa de mais verticais
    }

    // Direção preferida (a que tem menos)
    const preferDirection = hCount > vCount ? 'vertical' : 'horizontal';

    for (let i = 0; i < wordsToPlace.length && placedWords.length < targetTotal; i++) {
      const wordData = wordsToPlace[i];

      // Pula palavras já usadas
      if (usedWords.has(wordData.word)) continue;

      // Busca TODAS as posições válidas
      const allPlacements = findAllPlacements(grid, wordData.word, width, height);

      // FILTRA: APENAS posições COM interseção
      const withIntersection = allPlacements.filter(p => p.intersections > 0);

      // Se não há posição com interseção, PULA esta palavra (tenta na próxima passagem)
      if (withIntersection.length === 0) {
        continue;
      }

      // Atualiza contagem para verificar se já atingiu limite de uma direção
      const currentH = placedWords.filter(p => p.direction === 'horizontal').length;
      const currentV = placedWords.filter(p => p.direction === 'vertical').length;

      // Se uma direção já atingiu o limite, FORÇA a outra
      let candidates: Placement[];
      if (currentH >= targetH) {
        // Só aceita vertical
        candidates = withIntersection.filter(p => p.direction === 'vertical');
      } else if (currentV >= targetV) {
        // Só aceita horizontal
        candidates = withIntersection.filter(p => p.direction === 'horizontal');
      } else if (requiredDirection) {
        // Prefere a direção necessária, mas aceita outra se não houver
        const required = withIntersection.filter(p => p.direction === requiredDirection);
        candidates = required.length > 0 ? required : withIntersection;
      } else {
        // Prefere a direção com menos palavras
        const preferred = withIntersection.filter(p => p.direction === preferDirection);
        candidates = preferred.length > 0 ? preferred : withIntersection;
      }

      if (candidates.length === 0) {
        continue;
      }

      // Ordena por número de interseções (mais é melhor)
      candidates.sort((a, b) => b.intersections - a.intersections);

      // Entre as melhores (top 3), escolhe aleatoriamente para variedade
      const topScore = candidates[0].intersections;
      const topCandidates = candidates.filter(p => p.intersections >= topScore - 1).slice(0, 3);
      const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];

      placeWord(grid, wordData.word, chosen.x, chosen.y, chosen.direction);
      placedWords.push({
        word: wordData.word,
        clue: wordData.clue,
        x: chosen.x,
        y: chosen.y,
        direction: chosen.direction,
        id: wordId++,
      });
      usedWords.add(wordData.word);
    }

    // Se não conseguiu colocar nenhuma palavra nova nesta passagem, para
    if (placedWords.length === lastPlacedCount) {
      break;
    }
  }

  // Validação: garante que temos palavras balanceadas em ambas as direções
  const hCount = placedWords.filter(p => p.direction === 'horizontal').length;
  const vCount = placedWords.filter(p => p.direction === 'vertical').length;

  if (hCount === 0 || vCount === 0) {
    console.warn(`AVISO: Cruzada unidirecional! H=${hCount}, V=${vCount}`);
  } else if (Math.abs(hCount - vCount) > 2) {
    console.warn(`AVISO: Desbalanceado! H=${hCount}, V=${vCount} (diferença: ${Math.abs(hCount - vCount)})`);
  }

  return { grid, placedWords };
}

/**
 * Encontra TODAS as posições válidas para uma palavra
 */
function findAllPlacements(
  grid: (string | null)[][],
  word: string,
  width: number,
  height: number
): Placement[] {
  const placements: Placement[] = [];

  // Horizontal
  for (let y = 0; y < height; y++) {
    for (let x = 0; x <= width - word.length; x++) {
      if (canPlaceWord(grid, word, x, y, 'horizontal', width, height)) {
        const intersections = countIntersections(grid, word, x, y, 'horizontal');
        placements.push({ x, y, direction: 'horizontal', intersections });
      }
    }
  }

  // Vertical
  for (let x = 0; x < width; x++) {
    for (let y = 0; y <= height - word.length; y++) {
      if (canPlaceWord(grid, word, x, y, 'vertical', width, height)) {
        const intersections = countIntersections(grid, word, x, y, 'vertical');
        placements.push({ x, y, direction: 'vertical', intersections });
      }
    }
  }

  return placements;
}

/**
 * Conta quantas letras da palavra coincidem com letras já na grade (interseções)
 */
function countIntersections(
  grid: (string | null)[][],
  word: string,
  startX: number,
  startY: number,
  direction: 'horizontal' | 'vertical'
): number {
  const dx = direction === 'horizontal' ? 1 : 0;
  const dy = direction === 'vertical' ? 1 : 0;
  let count = 0;

  for (let i = 0; i < word.length; i++) {
    const x = startX + i * dx;
    const y = startY + i * dy;
    if (grid[y][x] === word[i]) {
      count++;
    }
  }

  return count;
}

/**
 * Conta interseções de uma palavra já colocada
 */
function countWordIntersections(grid: (string | null)[][], pw: PlacedWord): number {
  const dx = pw.direction === 'horizontal' ? 1 : 0;
  const dy = pw.direction === 'vertical' ? 1 : 0;
  let count = 0;

  for (let i = 0; i < pw.word.length; i++) {
    const x = pw.x + i * dx;
    const y = pw.y + i * dy;

    // Verifica se há palavra perpendicular passando por esta célula
    if (pw.direction === 'horizontal') {
      // Verifica se há letras acima ou abaixo (indica palavra vertical cruzando)
      const above = y > 0 ? grid[y - 1][x] : null;
      const below = y < grid.length - 1 ? grid[y + 1][x] : null;
      if (above !== null || below !== null) count++;
    } else {
      const left = x > 0 ? grid[y][x - 1] : null;
      const right = x < grid[0].length - 1 ? grid[y][x + 1] : null;
      if (left !== null || right !== null) count++;
    }
  }

  return count;
}

/**
 * Verifica se pode colocar palavra na posição
 */
function canPlaceWord(
  grid: (string | null)[][],
  word: string,
  startX: number,
  startY: number,
  direction: 'horizontal' | 'vertical',
  width: number,
  height: number
): boolean {
  const dx = direction === 'horizontal' ? 1 : 0;
  const dy = direction === 'vertical' ? 1 : 0;

  const endX = startX + (word.length - 1) * dx;
  const endY = startY + (word.length - 1) * dy;

  // Verifica limites
  if (startX < 0 || startY < 0 || endX >= width || endY >= height) {
    return false;
  }

  // Verifica célula ANTES da palavra (deve estar vazia)
  const beforeX = startX - dx;
  const beforeY = startY - dy;
  if (beforeX >= 0 && beforeY >= 0 && beforeX < width && beforeY < height) {
    if (grid[beforeY][beforeX] !== null) {
      return false;
    }
  }

  // Verifica célula DEPOIS da palavra (deve estar vazia)
  const afterX = endX + dx;
  const afterY = endY + dy;
  if (afterX >= 0 && afterY >= 0 && afterX < width && afterY < height) {
    if (grid[afterY][afterX] !== null) {
      return false;
    }
  }

  // Verifica cada posição da palavra
  let hasIntersection = false;

  for (let i = 0; i < word.length; i++) {
    const x = startX + i * dx;
    const y = startY + i * dy;
    const cell = grid[y][x];

    // Se célula ocupada, letra DEVE coincidir (interseção válida)
    if (cell !== null) {
      if (cell !== word[i]) {
        return false;
      }
      hasIntersection = true;
    } else {
      // Célula vazia - verifica adjacentes perpendiculares
      // Não pode criar extensões inválidas de outras palavras

      if (direction === 'horizontal') {
        // Para horizontal, verifica se há letras acima/abaixo que criariam palavra inválida
        const above = y > 0 ? grid[y - 1][x] : null;
        const below = y < height - 1 ? grid[y + 1][x] : null;

        // Se há letra acima E abaixo, estamos no meio de uma palavra vertical existente
        // Isso só é válido se a letra já estiver lá (interseção)
        if (above !== null && below !== null) {
          return false;
        }

        // Se há letra adjacente perpendicular sem ser interseção real,
        // verifica se não estamos criando extensão inválida
        if (above !== null || below !== null) {
          // Verifica se é uma extensão paralela (adjacente à palavra existente sem cruzar)
          // Isso criaria ambiguidade na leitura
          const leftCell = x > 0 ? grid[y][x - 1] : null;
          const rightCell = x < width - 1 ? grid[y][x + 1] : null;

          // Se a célula à esquerda ou direita também tem adjacente perpendicular,
          // pode estar criando palavra paralela colada
          if (i > 0 && leftCell === null) {
            const leftAbove = y > 0 && x > 0 ? grid[y - 1][x - 1] : null;
            const leftBelow = y < height - 1 && x > 0 ? grid[y + 1][x - 1] : null;
            if ((above !== null && leftAbove !== null) || (below !== null && leftBelow !== null)) {
              // Palavras paralelas coladas - evitar
              // (descomente para ser mais restritivo)
              // return false;
            }
          }
        }
      } else {
        // Para vertical, verifica esquerda/direita
        const left = x > 0 ? grid[y][x - 1] : null;
        const right = x < width - 1 ? grid[y][x + 1] : null;

        if (left !== null && right !== null) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Coloca palavra na grade
 */
function placeWord(
  grid: (string | null)[][],
  word: string,
  startX: number,
  startY: number,
  direction: 'horizontal' | 'vertical'
): void {
  const dx = direction === 'horizontal' ? 1 : 0;
  const dy = direction === 'vertical' ? 1 : 0;

  for (let i = 0; i < word.length; i++) {
    const x = startX + i * dx;
    const y = startY + i * dy;
    grid[y][x] = word[i];
  }
}

/**
 * Converte para romano
 */
function toRoman(num: number): string {
  const romanNumerals: [number, string][] = [
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];
  let result = '';
  let n = num;
  for (const [value, symbol] of romanNumerals) {
    while (n >= value) {
      result += symbol;
      n -= value;
    }
  }
  return result;
}

/**
 * Constrói o puzzle final
 */
function buildCrosswordPuzzle(
  grid: (string | null)[][],
  placedWords: PlacedWord[],
  width: number,
  height: number,
  title: string,
  description: string
): CrosswordPuzzle {
  // Células
  const cells: CrosswordCell[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];
      if (cell !== null) {
        cells.push({ x: String(x + 1), y: String(y + 1), solution: cell });
      } else {
        cells.push({ x: String(x + 1), y: String(y + 1), type: 'block' });
      }
    }
  }

  // Ordena por posição
  const sortedWords = [...placedWords].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  sortedWords.forEach((pw, index) => {
    pw.id = index + 1;
  });

  // Lista de palavras com ranges
  const wordList: CrosswordWord[] = sortedWords.map((pw) => {
    const startX = pw.x + 1;
    const startY = pw.y + 1;

    if (pw.direction === 'horizontal') {
      const endX = startX + pw.word.length - 1;
      return {
        id: String(pw.id),
        x: startX === endX ? String(startX) : `${startX}-${endX}`,
        y: String(startY),
      };
    } else {
      const endY = startY + pw.word.length - 1;
      return {
        id: String(pw.id),
        x: String(startX),
        y: startY === endY ? String(startY) : `${startY}-${endY}`,
      };
    }
  });

  // Verticais por coluna
  const verticalWords = sortedWords
    .filter((pw) => pw.direction === 'vertical')
    .sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      return a.y - b.y;
    });

  // Horizontais por linha
  const horizontalWords = sortedWords
    .filter((pw) => pw.direction === 'horizontal')
    .sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

  // Pistas verticais
  let vNumber = 1;
  let lastVCol = -1;
  const verticalClues: CrosswordClue[] = verticalWords.map((pw) => {
    let number: string;
    if (pw.x !== lastVCol) {
      number = String(vNumber++);
      lastVCol = pw.x;
    } else {
      number = '-';
    }
    return {
      word: String(pw.id),
      number,
      format: String(pw.word.length),
      value: pw.clue,
    };
  });

  // Pistas horizontais
  let hNumber = 1;
  let lastHRow = -1;
  const horizontalClues: CrosswordClue[] = horizontalWords.map((pw) => {
    let number: string;
    if (pw.y !== lastHRow) {
      number = toRoman(hNumber++);
      lastHRow = pw.y;
    } else {
      number = '-';
    }
    return {
      word: String(pw.id),
      number,
      format: String(pw.word.length),
      value: pw.clue,
    };
  });

  const clues: CrosswordClueGroup[] = [];
  if (verticalClues.length > 0) {
    clues.push({ title: 'Vertical', clue: verticalClues });
  }
  if (horizontalClues.length > 0) {
    clues.push({ title: 'Horizontal', clue: horizontalClues });
  }

  return {
    metadata: {
      title,
      creator: 'nano passatempos',
      copyright: `${new Date().getFullYear()} nano passatempos`,
      description,
    },
    grid: { width, height, cell: cells },
    word: wordList,
    clues,
  };
}

/**
 * Valida cruzada
 */
export function validateCrossword(puzzle: CrosswordPuzzle): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!puzzle.metadata.title) errors.push('Título é obrigatório');
  if (!puzzle.metadata.description) errors.push('Descrição é obrigatória');
  if (puzzle.clues.length === 0) errors.push('Deve ter pelo menos uma pista');

  const totalClues = puzzle.clues.reduce((acc, group) => acc + group.clue.length, 0);
  if (totalClues < 3) errors.push('Deve ter pelo menos 3 palavras');

  return { valid: errors.length === 0, errors };
}
