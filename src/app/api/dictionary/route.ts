import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cache do dicionário em memória (carrega uma vez)
let dictionaryCache: Map<string, string[]> | null = null;

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
 * Carrega e indexa o dicionário
 */
async function loadDictionary(): Promise<Map<string, string[]>> {
  if (dictionaryCache !== null) {
    return dictionaryCache;
  }

  console.log('Carregando dicionário...');
  const startTime = Date.now();

  const dictPath = path.join(process.cwd(), 'src/data/palavras_pt_br.txt');

  try {
    const content = await fs.promises.readFile(dictPath, 'utf-8');
    const words = content
      .split('\n')
      .map(w => w.trim())
      .filter(w => w.length >= 4);

    dictionaryCache = new Map();

    for (const word of words) {
      const normalized = normalizeWord(word);
      if (normalized.length >= 4) {
        if (!dictionaryCache.has(normalized)) {
          dictionaryCache.set(normalized, []);
        }
        dictionaryCache.get(normalized)!.push(word);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`Dicionário carregado: ${words.length} palavras, ${dictionaryCache.size} únicas em ${elapsed}ms`);

    return dictionaryCache;
  } catch (error) {
    console.error('Erro ao carregar dicionário:', error);
    return new Map();
  }
}

// Palavras comuns em português (priorizadas na seleção)
const COMMON_WORDS = new Set([
  'CASA', 'AGUA', 'AMOR', 'VIDA', 'TEMPO', 'TERRA', 'MUNDO', 'LADO', 'HORA', 'COISA',
  'MODO', 'PARTE', 'LUGAR', 'NOME', 'CASO', 'PONTO', 'FORMA', 'MEIO', 'OBRA', 'FATO',
  'TIPO', 'LINHA', 'FACE', 'AREA', 'BASE', 'FORA', 'ISSO', 'ESSE', 'AQUI', 'ONDE',
  'COMO', 'MAIS', 'CADA', 'OUTRO', 'MESMO', 'NOVO', 'PRIMEIRO', 'ULTIMO', 'GRANDE',
  'BELO', 'ALTO', 'BAIXO', 'LONGO', 'LARGO', 'FORTE', 'LIVRE', 'CERTO', 'CLARO',
  'FAZER', 'PODER', 'SABER', 'QUERER', 'DIZER', 'ESTAR', 'FICAR', 'TOMAR', 'LEVAR',
  'PEDIR', 'CRIAR', 'ABRIR', 'FALAR', 'OLHAR', 'COMER', 'BEBER', 'ANDAR', 'CORRER',
  'SALA', 'MESA', 'PORTA', 'JANELA', 'CAMA', 'CADEIRA', 'LIVRO', 'PAPEL', 'CAIXA',
]);

/**
 * Encontra TODAS as palavras que podem ser formadas com as letras dadas
 */
function findAllWordsWithLetters(
  dictionary: Map<string, string[]>,
  letters: string[],
  centerLetter: string
): { normalized: string; original: string }[] {
  const letterSet = new Set(letters.map(l => l.toUpperCase()));
  const center = centerLetter.toUpperCase();
  const results: { normalized: string; original: string }[] = [];

  for (const [normalized, originals] of dictionary.entries()) {
    if (normalized.length < 4) continue;
    if (!normalized.includes(center)) continue;

    let valid = true;
    for (const char of normalized) {
      if (!letterSet.has(char)) {
        valid = false;
        break;
      }
    }

    if (valid) {
      results.push({
        normalized,
        original: originals[0],
      });
    }
  }

  return results;
}

/**
 * Embaralha array (Fisher-Yates)
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
 * Seleciona as melhores palavras até o limite máximo
 * Prioriza: palavras do tema > pangrams > palavras comuns > diversidade de tamanho
 */
function selectBestWords(
  words: { normalized: string; original: string }[],
  letters: string[],
  maxWords: number,
  themeWords: Set<string> = new Set()
): { normalized: string; original: string }[] {
  if (words.length <= maxWords) {
    return words;
  }

  // Calcula score para cada palavra com aleatoriedade
  const scored = words.map(word => {
    let score = 0;

    // PRIORIDADE 1: Palavras do tema da IA (+500) - MUITO IMPORTANTE
    if (themeWords.has(word.normalized)) score += 500;

    // PRIORIDADE 2: Pangrams (+200)
    const wordLetters = new Set(word.normalized.split(''));
    const isPangram = letters.every(l => wordLetters.has(l.toUpperCase()));
    if (isPangram) score += 200;

    // PRIORIDADE 3: Palavras comuns (+50)
    if (COMMON_WORDS.has(word.normalized)) score += 50;

    // PRIORIDADE 4: Tamanho ideal (5-8 letras): +10, 4 letras: +2, 9+: +5
    if (word.normalized.length >= 5 && word.normalized.length <= 8) score += 10;
    else if (word.normalized.length === 4) score += 2;
    else score += 5;

    // ALEATORIEDADE: Adiciona variação aleatória (+0 a +30) para evitar sempre as mesmas palavras
    score += Math.random() * 30;

    return { ...word, score };
  });

  // Ordena por score (maior primeiro)
  scored.sort((a, b) => b.score - a.score);

  // Seleciona mantendo diversidade de tamanho
  const selected: typeof scored = [];
  const byLength = new Map<number, typeof scored>();

  // Agrupa por tamanho E embaralha dentro de cada grupo
  for (const word of scored) {
    const len = word.normalized.length;
    if (!byLength.has(len)) byLength.set(len, []);
    byLength.get(len)!.push(word);
  }

  // Embaralha cada grupo de tamanho para ter variedade
  for (const [len, wordsOfLen] of byLength.entries()) {
    // Mantém os de score alto no topo, mas embaralha os similares
    const highScore = wordsOfLen.filter(w => w.score > 100);
    const normalScore = shuffleArray(wordsOfLen.filter(w => w.score <= 100));
    byLength.set(len, [...highScore, ...normalScore]);
  }

  // Garante pelo menos algumas palavras de cada tamanho (4-12)
  const minPerLength = Math.max(2, Math.floor(maxWords / 10));
  for (let len = 4; len <= 12; len++) {
    const wordsOfLength = byLength.get(len) || [];
    const toTake = Math.min(wordsOfLength.length, minPerLength);
    selected.push(...wordsOfLength.slice(0, toTake));
  }

  // Preenche o resto com palavras restantes (já ordenadas por score com aleatoriedade)
  const selectedSet = new Set(selected.map(w => w.normalized));
  for (const word of scored) {
    if (selected.length >= maxWords) break;
    if (!selectedSet.has(word.normalized)) {
      selected.push(word);
      selectedSet.add(word.normalized);
    }
  }

  // Remove campo score antes de retornar
  return selected.slice(0, maxWords).map(({ normalized, original }) => ({ normalized, original }));
}

// Limites de palavras por dificuldade
const WORD_LIMITS = {
  easy: { min: 20, max: 35, target: 25 },
  medium: { min: 35, max: 55, target: 45 },
  hard: { min: 50, max: 70, target: 60 },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, themeWords, letters, centerLetter, difficulty = 'medium' } = body;

    const dictionary = await loadDictionary();
    const limits = WORD_LIMITS[difficulty as keyof typeof WORD_LIMITS] || WORD_LIMITS.medium;

    if (action === 'findBestCombination') {
      // Encontra a melhor combinação de 7 letras baseada nas palavras do tema
      const normalizedThemeWords = (themeWords as string[]).map(w => normalizeWord(w));

      // Conta frequência de letras nas palavras do tema
      const letterFreq = new Map<string, number>();
      for (const word of normalizedThemeWords) {
        const uniqueLetters = new Set(word.split(''));
        for (const letter of uniqueLetters) {
          letterFreq.set(letter, (letterFreq.get(letter) || 0) + 1);
        }
      }

      // Ordena letras por frequência
      const sortedLetters = Array.from(letterFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([letter]) => letter);

      console.log('Soletra API: Letras do tema ordenadas:', sortedLetters.slice(0, 15).join(', '));
      console.log(`Soletra API: Dificuldade ${difficulty}, alvo ${limits.target} palavras (${limits.min}-${limits.max})`);

      if (sortedLetters.length < 7) {
        return NextResponse.json({ error: 'Menos de 7 letras únicas' }, { status: 400 });
      }

      let bestResult: {
        letters: string[];
        centerLetter: string;
        totalWords: number;
        validWords: { normalized: string; original: string }[];
        pangrams: string[];
        score: number;
      } | null = null;

      const maxAttempts = 500;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const poolSize = Math.min(7 + Math.floor(attempt / 30), sortedLetters.length);
        const pool = sortedLetters.slice(0, poolSize);

        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const selectedLetters = shuffled.slice(0, 7);

        for (const center of selectedLetters) {
          // Busca TODAS as palavras válidas primeiro
          const allWords = findAllWordsWithLetters(dictionary, selectedLetters, center);
          const totalWords = allWords.length;

          const pangrams = allWords.filter(({ normalized }) => {
            const wordLetters = new Set(normalized.split(''));
            return selectedLetters.every(l => wordLetters.has(l));
          }).map(({ normalized }) => normalized);

          // Score: prioriza combinações próximas do alvo
          // Prefere combinações que naturalmente tenham o número certo de palavras
          const distanceFromTarget = Math.abs(totalWords - limits.target);
          const inRange = totalWords >= limits.min && totalWords <= limits.max;

          let score = 0;
          if (inRange) score += 500; // Forte bônus se está no range naturalmente
          else if (totalWords > limits.max) score += 100; // Ok se temos que limitar
          score -= distanceFromTarget; // Penaliza distância do alvo
          score += pangrams.length * 30; // Bônus por pangrams

          if (totalWords >= limits.min && (!bestResult || score > bestResult.score)) {
            bestResult = {
              letters: selectedLetters,
              centerLetter: center,
              totalWords,
              validWords: allWords,
              pangrams,
              score,
            };

            // Para se encontrou resultado perfeito (no range naturalmente com pangram)
            if (inRange && pangrams.length > 0) {
              console.log(`Soletra API: Combinação ideal na tentativa ${attempt + 1}: ${totalWords} palavras`);
              break;
            }
          }
        }

        // Para se já tem resultado bom no range
        if (bestResult && bestResult.totalWords >= limits.min &&
            bestResult.totalWords <= limits.max && bestResult.pangrams.length > 0) {
          break;
        }
      }

      if (!bestResult) {
        return NextResponse.json({ error: 'Não foi possível encontrar combinação válida' }, { status: 400 });
      }

      // Cria set de palavras do tema para priorização
      const themeWordsSet = new Set(normalizedThemeWords);
      console.log(`Soletra API: ${themeWordsSet.size} palavras do tema para priorizar`);

      // Se temos mais palavras que o máximo, seleciona as melhores (priorizando tema)
      let finalWords = bestResult.validWords;
      if (finalWords.length > limits.max) {
        console.log(`Soletra API: Limitando de ${finalWords.length} para ${limits.max} palavras`);
        finalWords = selectBestWords(finalWords, bestResult.letters, limits.max, themeWordsSet);
      }

      // Recalcula pangrams após seleção
      const finalPangrams = finalWords.filter(({ normalized }) => {
        const wordLetters = new Set(normalized.split(''));
        return bestResult!.letters.every(l => wordLetters.has(l));
      }).map(({ normalized }) => normalized);

      // Conta quantas palavras do tema foram incluídas
      const themeWordsIncluded = finalWords.filter(w => themeWordsSet.has(w.normalized)).length;
      console.log(`Soletra API: Resultado final - ${finalWords.length} palavras, ${finalPangrams.length} pangrams, ${themeWordsIncluded}/${themeWordsSet.size} do tema`);

      return NextResponse.json({
        letters: bestResult.letters,
        centerLetter: bestResult.centerLetter,
        validWords: finalWords,
        pangrams: finalPangrams,
      });

    } else if (action === 'findWords') {
      // Encontra palavras para letras específicas
      const allWords = findAllWordsWithLetters(dictionary, letters, centerLetter);

      // Limita ao máximo da dificuldade
      const finalWords = selectBestWords(allWords, letters, limits.max);

      const pangrams = finalWords.filter(({ normalized }) => {
        const wordLetters = new Set(normalized.split(''));
        return letters.every((l: string) => wordLetters.has(l.toUpperCase()));
      }).map(({ normalized }) => normalized);

      return NextResponse.json({
        validWords: finalWords,
        pangrams,
      });

    } else {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

  } catch (error) {
    console.error('Erro na API do dicionário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
