import { SoletraPuzzle, Difficulty, GeneratedWord } from '@/types';

/**
 * Gerador de Soletra (Spelling Bee)
 *
 * Algoritmo melhorado:
 * 1. Usa API com dicionário completo de português (~244k palavras)
 * 2. Usa palavras do tema para determinar as melhores 7 letras
 * 3. Busca TODAS as palavras do dicionário formáveis com essas letras
 * 4. Resultado: 30-60+ palavras válidas (como NYT Spelling Bee)
 */

// ============================================
// Regras do Soletra
// ============================================

const MIN_WORD_LENGTH = 4;
const PANGRAM_BONUS = 7;

// ============================================
// Utilitários
// ============================================

/**
 * Normaliza uma palavra (maiúsculas, sem acentos)
 */
function normalizeWord(word: string): string {
  return word
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
}

/**
 * Verifica se uma palavra é um pangrama (usa todas as 7 letras)
 */
function isPangram(word: string, letters: string[]): boolean {
  const normalizedWord = normalizeWord(word);
  const wordLetters = new Set(normalizedWord.split(''));
  return letters.every(letter => wordLetters.has(letter));
}

/**
 * Calcula a pontuação de uma palavra
 */
function calculateWordScore(word: string, letters: string[]): number {
  const normalizedWord = normalizeWord(word);
  const length = normalizedWord.length;

  let score = length === 4 ? 1 : length;

  if (isPangram(word, letters)) {
    score += PANGRAM_BONUS;
  }

  return score;
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

// ============================================
// Geração do Puzzle
// ============================================

/**
 * Calcula os rankings (níveis de pontuação)
 */
function calculateRankings(maxScore: number): SoletraPuzzle['rankings'] {
  return {
    beginner: Math.floor(maxScore * 0.02),
    good: Math.floor(maxScore * 0.05),
    great: Math.floor(maxScore * 0.10),
    amazing: Math.floor(maxScore * 0.25),
    genius: Math.floor(maxScore * 0.70),
  };
}

/**
 * Gera um puzzle de Soletra usando IA + dicionário
 * A IA escolhe as letras e seleciona as melhores palavras baseadas no tema
 */
export async function generateSoletra(
  words: GeneratedWord[],
  difficulty: Difficulty,
  title: string,
  theme?: string
): Promise<SoletraPuzzle | null> {
  // Extrai o tema das palavras ou usa o título
  const themeText = theme || title || words.map(w => w.word).join(' ');

  console.log('Soletra: Gerando puzzle com IA');
  console.log('Soletra: Tema:', themeText);
  console.log('Soletra: Dificuldade:', difficulty);

  try {
    // Chama a nova API que usa IA para gerar o puzzle
    const response = await fetch('/api/soletra', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: themeText,
        difficulty,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Soletra: Erro da API:', error);
      return null;
    }

    const result = await response.json();
    const { letters, centerLetter, validWords, pangrams, themeRelevantWords } = result;

    console.log(`Soletra: ${validWords.length} palavras selecionadas pela IA`);
    console.log(`Soletra: Letras: ${letters.join('')}, Central: ${centerLetter}`);
    console.log(`Soletra: Pangrams: ${pangrams.length}`);
    console.log(`Soletra: Palavras do tema: ${themeRelevantWords?.length || 0}`);

    // Calcula pontuação máxima
    const maxScore = validWords.reduce((total: number, word: string) => {
      return total + calculateWordScore(word, letters);
    }, 0);

    // Ordena letras: central primeiro, depois as outras embaralhadas
    const otherLetters = shuffleArray(letters.filter((l: string) => l !== centerLetter));
    const orderedLetters = [centerLetter, ...otherLetters];

    console.log('Soletra: Puzzle criado com sucesso -', validWords.length, 'palavras, maxScore:', maxScore);

    return {
      name: title,
      difficulty,
      letters: orderedLetters,
      centerLetter,
      validWords: validWords.sort(),
      pangrams,
      maxScore,
      rankings: calculateRankings(maxScore),
    };

  } catch (error) {
    console.error('Soletra: Erro ao gerar puzzle:', error);
    return null;
  }
}

/**
 * Gera um Soletra a partir de um conjunto de letras pré-definido
 */
export async function generateSoletraFromLetters(
  letters: string[],
  centerLetter: string,
  difficulty: Difficulty,
  title: string
): Promise<SoletraPuzzle | null> {
  if (letters.length !== 7) {
    console.error('Soletra: Necessário exatamente 7 letras');
    return null;
  }

  const normalizedLetters = letters.map(l => l.toUpperCase());
  const normalizedCenter = centerLetter.toUpperCase();

  if (!normalizedLetters.includes(normalizedCenter)) {
    console.error('Soletra: Letra central deve estar entre as 7 letras');
    return null;
  }

  try {
    const response = await fetch('/api/dictionary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'findWords',
        letters: normalizedLetters,
        centerLetter: normalizedCenter,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const { validWords, pangrams } = await response.json();

    if (validWords.length < 10) {
      console.error('Soletra: Menos de 10 palavras válidas encontradas');
      return null;
    }

    const normalizedValidWords = validWords.map((w: { normalized: string }) => w.normalized);

    const maxScore = normalizedValidWords.reduce((total: number, word: string) => {
      return total + calculateWordScore(word, normalizedLetters);
    }, 0);

    const otherLetters = shuffleArray(normalizedLetters.filter(l => l !== normalizedCenter));
    const orderedLetters = [normalizedCenter, ...otherLetters];

    return {
      name: title,
      difficulty,
      letters: orderedLetters,
      centerLetter: normalizedCenter,
      validWords: normalizedValidWords.sort(),
      pangrams,
      maxScore,
      rankings: calculateRankings(maxScore),
    };

  } catch (error) {
    console.error('Soletra: Erro ao gerar puzzle:', error);
    return null;
  }
}

/**
 * Valida um puzzle de Soletra
 */
export function validateSoletra(
  puzzle: SoletraPuzzle
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!puzzle.name) {
    errors.push('Nome/título é obrigatório');
  }

  if (puzzle.letters.length !== 7) {
    errors.push('Deve ter exatamente 7 letras');
  }

  if (!puzzle.centerLetter) {
    errors.push('Letra central é obrigatória');
  }

  if (!puzzle.letters.includes(puzzle.centerLetter)) {
    errors.push('Letra central deve estar entre as 7 letras');
  }

  if (puzzle.validWords.length === 0) {
    errors.push('Deve ter pelo menos uma palavra válida');
  }

  if (puzzle.validWords.length < 10) {
    errors.push(`Apenas ${puzzle.validWords.length} palavras - recomendado mínimo de 10`);
  }

  const letterSet = new Set(puzzle.letters);
  for (const word of puzzle.validWords) {
    if (word.length < MIN_WORD_LENGTH) {
      errors.push(`Palavra "${word}" tem menos de ${MIN_WORD_LENGTH} letras`);
    }
    if (!word.includes(puzzle.centerLetter)) {
      errors.push(`Palavra "${word}" não contém a letra central "${puzzle.centerLetter}"`);
    }
    for (const char of word) {
      if (!letterSet.has(char)) {
        errors.push(`Palavra "${word}" usa letra "${char}" não disponível`);
        break;
      }
    }
  }

  for (const pangram of puzzle.pangrams) {
    if (!isPangram(pangram, puzzle.letters)) {
      errors.push(`"${pangram}" não é um pangrama válido`);
    }
  }

  if (puzzle.maxScore <= 0) {
    errors.push('Pontuação máxima deve ser maior que zero');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Verifica se uma palavra do usuário é válida
 */
export function checkWord(
  puzzle: SoletraPuzzle,
  word: string
): { valid: boolean; score: number; isPangram: boolean; error?: string } {
  const normalized = normalizeWord(word);

  if (normalized.length < MIN_WORD_LENGTH) {
    return { valid: false, score: 0, isPangram: false, error: 'Palavra muito curta' };
  }

  if (!normalized.includes(puzzle.centerLetter)) {
    return { valid: false, score: 0, isPangram: false, error: 'Falta a letra central' };
  }

  const letterSet = new Set(puzzle.letters);
  for (const char of normalized) {
    if (!letterSet.has(char)) {
      return { valid: false, score: 0, isPangram: false, error: 'Usa letras não disponíveis' };
    }
  }

  if (!puzzle.validWords.includes(normalized)) {
    return { valid: false, score: 0, isPangram: false, error: 'Palavra não encontrada' };
  }

  const wordIsPangram = isPangram(normalized, puzzle.letters);
  const score = calculateWordScore(normalized, puzzle.letters);

  return {
    valid: true,
    score,
    isPangram: wordIsPangram,
  };
}

/**
 * Obtém o ranking atual baseado na pontuação
 */
export function getRanking(
  puzzle: SoletraPuzzle,
  currentScore: number
): { level: string; nextLevel: string | null; pointsToNext: number } {
  const { rankings } = puzzle;

  const levels = [
    { name: 'Iniciante', threshold: rankings.beginner },
    { name: 'Bom', threshold: rankings.good },
    { name: 'Ótimo', threshold: rankings.great },
    { name: 'Incrível', threshold: rankings.amazing },
    { name: 'Gênio', threshold: rankings.genius },
    { name: 'Rainha das Abelhas', threshold: puzzle.maxScore },
  ];

  let currentLevel = 'Iniciante';
  let nextLevel: string | null = 'Bom';
  let pointsToNext = rankings.beginner - currentScore;

  for (let i = 0; i < levels.length; i++) {
    if (currentScore >= levels[i].threshold) {
      currentLevel = levels[i].name;
      nextLevel = levels[i + 1]?.name || null;
      pointsToNext = nextLevel ? levels[i + 1].threshold - currentScore : 0;
    }
  }

  return { level: currentLevel, nextLevel, pointsToNext };
}
