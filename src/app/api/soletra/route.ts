import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Inicializa Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Cache do dicionário
let dictionaryWords: string[] | null = null;

// Limites por dificuldade
const WORD_LIMITS = {
  easy: { min: 20, max: 35, target: 25 },
  medium: { min: 35, max: 55, target: 45 },
  hard: { min: 50, max: 70, target: 60 },
};

/**
 * Carrega o dicionário
 */
async function loadDictionary(): Promise<string[]> {
  if (dictionaryWords) return dictionaryWords;

  const dictPath = path.join(process.cwd(), 'src/data/palavras_pt_br.txt');
  const content = await fs.promises.readFile(dictPath, 'utf-8');

  dictionaryWords = content
    .split('\n')
    .map(w => w.trim().toUpperCase())
    .filter(w => w.length >= 4 && /^[A-Z]+$/.test(w));

  console.log(`Dicionário carregado: ${dictionaryWords.length} palavras`);
  return dictionaryWords;
}

/**
 * Normaliza palavra (remove acentos)
 */
function normalizeWord(word: string): string {
  return word
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
}

/**
 * Encontra todas as palavras válidas para um conjunto de letras
 */
function findValidWords(
  dictionary: string[],
  letters: string[],
  centerLetter: string
): string[] {
  const letterSet = new Set(letters);
  const center = centerLetter.toUpperCase();

  return dictionary.filter(word => {
    if (word.length < 4) return false;
    if (!word.includes(center)) return false;

    for (const char of word) {
      if (!letterSet.has(char)) return false;
    }
    return true;
  });
}

/**
 * Usa Gemini para gerar o puzzle Soletra completo
 */
async function generateSoletraWithAI(
  theme: string,
  difficulty: string,
  dictionary: string[]
): Promise<{
  letters: string[];
  centerLetter: string;
  validWords: string[];
  pangrams: string[];
  themeRelevantWords: string[];
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const limits = WORD_LIMITS[difficulty as keyof typeof WORD_LIMITS] || WORD_LIMITS.medium;

  // Passo 1: Pedir à IA para escolher as 7 letras ideais para o tema
  const letterPrompt = `Você é um especialista em criar jogos de palavras como o Spelling Bee/Soletra.

TEMA: "${theme}"

TAREFA: Escolher 7 letras do alfabeto que permitam formar MUITAS palavras em português relacionadas ao tema.

REGRAS DO JOGO:
- 7 letras diferentes (sem repetição)
- 1 letra será a CENTRAL (obrigatória em todas as palavras)
- Jogadores formam palavras de 4+ letras usando apenas essas letras
- Cada letra pode ser usada várias vezes na mesma palavra
- A letra central deve aparecer em TODA palavra

ESTRATÉGIA:
- Escolha letras comuns em português (A, E, O, R, S, I, N, T, L, C, M, D, P)
- A letra central deve ser versátil e comum
- Pense em palavras do tema e extraia as letras mais frequentes
- Evite letras raras (K, W, Y, X, Z, Q)

EXEMPLOS de boas combinações:
- Tema "culinária": A, R, S, T, O, E, I (central: A) → permite: ASSAR, RISOTO, TORTA, ASAR...
- Tema "natureza": A, R, T, E, N, U, L (central: A) → permite: NATURAL, TERRA, PLANTA...

Responda APENAS em JSON:
{
  "letters": ["A", "B", "C", "D", "E", "F", "G"],
  "centerLetter": "A",
  "reasoning": "Explicação breve da escolha"
}`;

  let letters: string[] = [];
  let centerLetter = '';

  try {
    const letterResult = await model.generateContent(letterPrompt);
    const letterText = letterResult.response.text();
    const letterJson = JSON.parse(
      letterText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    );

    letters = letterJson.letters.map((l: string) => l.toUpperCase());
    centerLetter = letterJson.centerLetter.toUpperCase();

    console.log(`Soletra IA: Letras escolhidas: ${letters.join('')}, Central: ${centerLetter}`);
    console.log(`Soletra IA: Razão: ${letterJson.reasoning}`);
  } catch (error) {
    console.error('Erro ao gerar letras:', error);
    // Fallback: letras comuns
    letters = ['A', 'E', 'R', 'S', 'T', 'O', 'I'];
    centerLetter = 'A';
  }

  // Passo 2: Encontrar TODAS as palavras válidas no dicionário
  const allValidWords = findValidWords(dictionary, letters, centerLetter);
  console.log(`Soletra IA: ${allValidWords.length} palavras válidas encontradas no dicionário`);

  if (allValidWords.length < limits.min) {
    // Se poucas palavras, tentar novamente com letras mais comuns
    console.log('Poucas palavras, usando letras mais comuns...');
    letters = ['A', 'E', 'R', 'S', 'T', 'O', 'I'];
    centerLetter = 'A';
    const retryWords = findValidWords(dictionary, letters, centerLetter);
    if (retryWords.length > allValidWords.length) {
      allValidWords.length = 0;
      allValidWords.push(...retryWords);
    }
  }

  // Identificar pangrams
  const pangrams = allValidWords.filter(word => {
    const wordLetters = new Set(word.split(''));
    return letters.every(l => wordLetters.has(l));
  });

  // Passo 3: Usar IA para selecionar as melhores palavras relacionadas ao tema
  const wordSelectionPrompt = `Você está criando um jogo Soletra sobre o tema "${theme}".

LETRAS DISPONÍVEIS: ${letters.join(', ')} (Central: ${centerLetter})

Abaixo está a lista de TODAS as palavras válidas do dicionário português que podem ser formadas:

${allValidWords.slice(0, 500).join(', ')}
${allValidWords.length > 500 ? `\n... e mais ${allValidWords.length - 500} palavras` : ''}

TAREFA: Selecione as ${limits.target} MELHORES palavras para este jogo.

CRITÉRIOS DE SELEÇÃO (em ordem de prioridade):
1. PANGRAMS (palavras que usam todas as 7 letras) - SEMPRE inclua todos: ${pangrams.slice(0, 10).join(', ')}
2. Palavras RELACIONADAS ao tema "${theme}"
3. Palavras COMUNS e conhecidas (evite palavras muito técnicas ou arcaicas)
4. VARIEDADE de tamanhos (4, 5, 6, 7, 8+ letras)
5. Palavras INTERESSANTES e educativas

IMPORTANTE:
- Selecione EXATAMENTE ${limits.target} palavras
- TODAS as palavras devem estar na lista acima (são palavras reais do dicionário)
- Inclua TODOS os pangrams disponíveis
- Destaque quais palavras são mais relevantes ao tema

Responda APENAS em JSON:
{
  "selectedWords": ["PALAVRA1", "PALAVRA2", ...],
  "themeRelevantWords": ["palavras", "mais", "relacionadas", "ao", "tema"],
  "reasoning": "Explicação da seleção"
}`;

  let selectedWords: string[] = [];
  let themeRelevantWords: string[] = [];

  try {
    const selectionResult = await model.generateContent(wordSelectionPrompt);
    const selectionText = selectionResult.response.text();
    const selectionJson = JSON.parse(
      selectionText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    );

    // Valida que as palavras selecionadas existem no dicionário
    const validSet = new Set(allValidWords);
    selectedWords = (selectionJson.selectedWords || [])
      .map((w: string) => w.toUpperCase())
      .filter((w: string) => validSet.has(w));

    themeRelevantWords = (selectionJson.themeRelevantWords || [])
      .map((w: string) => w.toUpperCase())
      .filter((w: string) => validSet.has(w));

    console.log(`Soletra IA: ${selectedWords.length} palavras selecionadas pela IA`);
    console.log(`Soletra IA: ${themeRelevantWords.length} palavras relevantes ao tema`);
    console.log(`Soletra IA: Razão: ${selectionJson.reasoning}`);

  } catch (error) {
    console.error('Erro ao selecionar palavras:', error);
  }

  // Se a IA não retornou palavras suficientes, complementa com seleção aleatória
  if (selectedWords.length < limits.min) {
    console.log(`Complementando seleção: ${selectedWords.length} → ${limits.target}`);

    // Garante que pangrams estão incluídos
    const selectedSet = new Set(selectedWords);
    for (const pangram of pangrams) {
      if (!selectedSet.has(pangram)) {
        selectedWords.push(pangram);
        selectedSet.add(pangram);
      }
    }

    // Adiciona palavras aleatórias até atingir o alvo
    const shuffled = [...allValidWords].sort(() => Math.random() - 0.5);
    for (const word of shuffled) {
      if (selectedWords.length >= limits.target) break;
      if (!selectedSet.has(word)) {
        selectedWords.push(word);
        selectedSet.add(word);
      }
    }
  }

  // Limita ao máximo
  if (selectedWords.length > limits.max) {
    // Mantém pangrams e palavras do tema, remove o resto
    const mustKeep = new Set([...pangrams, ...themeRelevantWords]);
    const toKeep = selectedWords.filter(w => mustKeep.has(w));
    const others = selectedWords.filter(w => !mustKeep.has(w)).sort(() => Math.random() - 0.5);

    selectedWords = [...toKeep, ...others].slice(0, limits.max);
  }

  // Recalcula pangrams no resultado final
  const finalPangrams = selectedWords.filter(word => {
    const wordLetters = new Set(word.split(''));
    return letters.every(l => wordLetters.has(l));
  });

  return {
    letters,
    centerLetter,
    validWords: selectedWords.sort(),
    pangrams: finalPangrams,
    themeRelevantWords,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { theme, difficulty = 'medium' } = body;

    if (!theme) {
      return NextResponse.json({ error: 'Tema é obrigatório' }, { status: 400 });
    }

    console.log(`\n=== Gerando Soletra ===`);
    console.log(`Tema: ${theme}`);
    console.log(`Dificuldade: ${difficulty}`);

    // Carrega dicionário
    const dictionary = await loadDictionary();

    // Gera puzzle com IA
    const result = await generateSoletraWithAI(theme, difficulty, dictionary);

    console.log(`=== Resultado Final ===`);
    console.log(`Letras: ${result.letters.join('')} (Central: ${result.centerLetter})`);
    console.log(`Palavras: ${result.validWords.length}`);
    console.log(`Pangrams: ${result.pangrams.length}`);
    console.log(`Palavras do tema: ${result.themeRelevantWords.length}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Erro na API Soletra:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
