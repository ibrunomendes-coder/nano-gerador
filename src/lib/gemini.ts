import { GoogleGenerativeAI } from '@google/generative-ai';
import { GameType, Difficulty, GRID_CONFIGS, GeneratedWord } from '@/types';

// Inicializa o cliente Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export type SourceType = 'gemini' | 'document' | 'both';

export interface GeminiWordResponse {
  words: GeneratedWord[];
  description: string;
}

/**
 * Gera palavras e pistas para um passatempo baseado no tema e/ou documento
 */
export async function generateWordsForPuzzle(
  gameType: GameType,
  difficulty: Difficulty,
  theme: string,
  sourceType: SourceType = 'gemini',
  documentText?: string | null
): Promise<GeminiWordResponse> {
  const config = GRID_CONFIGS[gameType][difficulty];
  // Para cruzadas, usar horizontalWords + verticalWords; para caça-palavras, usar média
  const wordCount = gameType === 'crossword' && config.horizontalWords && config.verticalWords
    ? config.horizontalWords + config.verticalWords
    : Math.floor((config.minWords + config.maxWords) / 2);

  // Se for apenas documento, extrair palavras diretamente
  if (sourceType === 'document' && documentText) {
    return extractWordsFromDocument(documentText, wordCount, config.width, gameType);
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  let prompt: string;

  if (sourceType === 'both' && documentText) {
    // Combina documento + tema
    prompt = gameType === 'crossword'
      ? buildCrosswordPromptWithDocument(theme, documentText, wordCount, config.width)
      : buildWordsearchPromptWithDocument(theme, documentText, wordCount, config.width);
  } else {
    // Apenas Gemini
    prompt = gameType === 'crossword'
      ? buildCrosswordPrompt(theme, wordCount, config.width)
      : buildWordsearchPrompt(theme, wordCount, config.width);
  }

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return parseGeminiResponse(text, gameType);
  } catch (error) {
    console.error('Erro ao gerar palavras:', error);
    throw new Error('Falha ao gerar palavras com Gemini');
  }
}

/**
 * Extrai palavras relevantes de um documento usando Gemini
 */
async function extractWordsFromDocument(
  documentText: string,
  wordCount: number,
  maxLength: number,
  gameType: GameType
): Promise<GeminiWordResponse> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Limitar texto do documento para não exceder limite do modelo
  const truncatedDoc = documentText.substring(0, 15000);

  const isWordsearch = gameType === 'wordsearch';

  const wordsearchInstructions = `
=== PASSO 1: CRIAR A DESCRIÇÃO PRIMEIRO ===
Escreva um parágrafo educativo (200-400 caracteres) que:
- Resuma informações importantes do documento
- Contenha EXATAMENTE ${wordCount} palavras-chave em MAIÚSCULAS integradas no texto
- As palavras em MAIÚSCULAS serão as palavras do caça-palavras
- O texto deve ser fluido e fazer sentido

EXEMPLO:
"A GRELINA é um hormônio peptídico produzido principalmente pelas CÉLULAS do ESTÔMAGO, que ajuda na regulação do APETITE e do metabolismo energético. Descoberta em 1999 por pesquisadores JAPONESES, ficou conhecida como hormônio da FOME, por estimular a sensação de fome e aumentar a ingestão ALIMENTAR."

=== PASSO 2: EXTRAIR AS PALAVRAS ===
Liste as palavras em MAIÚSCULAS que aparecem na descrição.

REGRAS PARA AS PALAVRAS:
- Entre 4 e ${maxLength} letras cada
- Apenas letras MAIÚSCULAS (converter acentos: Á→A, É→E, Í→I, Ó→O, Ú→U, Ç→C)
- Sem espaços ou hífens
- Cada palavra DEVE aparecer em MAIÚSCULAS na descrição`;

  const crosswordInstructions = `
REGRAS PARA AS PALAVRAS:
1. Cada palavra deve ter entre 3 e ${maxLength} letras
2. Apenas letras MAIÚSCULAS (sem acentos, cedilha, espaços ou hífens)
3. Varie o tamanho das palavras
4. Escolha palavras-chave importantes do documento
5. Para cada palavra, crie uma pista/definição baseada no contexto (max 60 caracteres)

A descrição deve ser uma breve explicação do tema do documento (max 150 caracteres).`;

  const prompt = `Você é um especialista em criar passatempos educativos em português brasileiro.

Analise o documento abaixo e crie ${isWordsearch ? 'um caça-palavras' : 'uma palavra cruzada'}.

DOCUMENTO:
"""
${truncatedDoc}
"""

TAREFA: Criar ${isWordsearch ? 'um caça-palavras' : 'uma palavra cruzada'} com EXATAMENTE ${wordCount} palavras.

${isWordsearch ? wordsearchInstructions : crosswordInstructions}

Responda APENAS em formato JSON:
{
  "description": "${isWordsearch ? 'Parágrafo educativo com as PALAVRAS em MAIÚSCULAS' : 'Breve descrição do tema'}",
  "words": [
    {"word": "PALAVRA", "clue": "${!isWordsearch ? 'Pista baseada no documento' : ''}"}
  ]
}

VERIFICAÇÃO FINAL:
- O array "words" deve ter EXATAMENTE ${wordCount} palavras
${isWordsearch ? '- Cada palavra do array DEVE aparecer em MAIÚSCULAS na "description"' : ''}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return parseGeminiResponse(text, gameType);
  } catch (error) {
    console.error('Erro ao extrair palavras do documento:', error);
    throw new Error('Falha ao processar documento');
  }
}

function buildCrosswordPrompt(theme: string, wordCount: number, maxLength: number): string {
  return `Você é um criador de palavras cruzadas profissional em português brasileiro.

Tema: "${theme}"

IMPORTANTE: Gere EXATAMENTE ${wordCount} palavras (nem mais, nem menos).

Regras para as palavras:
1. Cada palavra deve ter entre 3 e ${maxLength} letras
2. Apenas letras MAIÚSCULAS (sem acentos, cedilha, espaços ou hífens)
3. Varie o tamanho das palavras: algumas curtas (3-4 letras), médias (5-7) e longas (8+)
4. Para cada palavra, crie uma pista/definição criativa e concisa (max 60 caracteres)
5. As pistas devem ser interessantes e educativas
6. Evite palavras muito similares ou repetitivas

Responda APENAS em formato JSON, assim:
{
  "description": "Uma breve descrição do tema (max 150 caracteres)",
  "words": [
    {"word": "EXEMPLO", "clue": "Pista para a palavra exemplo"},
    {"word": "OUTRA", "clue": "Pista para outra palavra"}
  ]
}

ATENÇÃO: Retorne EXATAMENTE ${wordCount} palavras no array. Isso é essencial para o passatempo funcionar.`;
}

function buildCrosswordPromptWithDocument(
  theme: string,
  documentText: string,
  wordCount: number,
  maxLength: number
): string {
  const truncatedDoc = documentText.substring(0, 12000);

  return `Você é um criador de palavras cruzadas educativas em português brasileiro.

Tema principal: "${theme}"

Use o documento abaixo como contexto adicional:

DOCUMENTO:
"""
${truncatedDoc}
"""

IMPORTANTE: Gere EXATAMENTE ${wordCount} palavras (nem mais, nem menos).

Regras para as palavras:
1. Cada palavra deve ter entre 3 e ${maxLength} letras
2. Apenas letras MAIÚSCULAS (sem acentos, cedilha, espaços ou hífens)
3. Varie o tamanho das palavras: algumas curtas (3-4), médias (5-7) e longas (8+)
4. Combine conhecimento do tema COM informações do documento
5. Para cada palavra, crie uma pista/definição criativa baseada no contexto (max 60 caracteres)
6. Priorize termos técnicos ou específicos do documento quando apropriado

Responda APENAS em formato JSON:
{
  "description": "Uma descrição que conecte o tema ao documento (max 150 caracteres)",
  "words": [
    {"word": "EXEMPLO", "clue": "Pista contextualizada"},
    {"word": "OUTRA", "clue": "Pista baseada no documento"}
  ]
}

ATENÇÃO: Retorne EXATAMENTE ${wordCount} palavras no array. Isso é essencial para o passatempo funcionar.`;
}

function buildWordsearchPrompt(theme: string, wordCount: number, maxLength: number): string {
  return `Você é um criador de caça-palavras educativos em português brasileiro.

Tema: "${theme}"

TAREFA: Criar um caça-palavras com ${wordCount} palavras E uma descrição educativa.

=== PASSO 1: CRIAR A DESCRIÇÃO PRIMEIRO ===
Escreva um parágrafo educativo sobre o tema (200-400 caracteres) que:
- Seja informativo e interessante
- Contenha EXATAMENTE ${wordCount} palavras-chave em MAIÚSCULAS integradas no texto
- As palavras em MAIÚSCULAS serão as palavras do caça-palavras
- O texto deve ser fluido e fazer sentido

EXEMPLO (tema: hormônios):
"A GRELINA é um hormônio peptídico produzido principalmente pelas CÉLULAS do ESTÔMAGO, que ajuda na regulação do APETITE e do metabolismo energético. Descoberta em 1999 por pesquisadores JAPONESES, ficou conhecida como hormônio da FOME, por estimular a sensação de fome e aumentar a ingestão ALIMENTAR."

Palavras do exemplo: GRELINA, CÉLULAS, ESTÔMAGO, APETITE, JAPONESES, FOME, ALIMENTAR (7 palavras)

=== PASSO 2: EXTRAIR AS PALAVRAS ===
Depois de escrever a descrição, liste as palavras em MAIÚSCULAS que aparecem nela.

REGRAS PARA AS PALAVRAS:
- Entre 4 e ${maxLength} letras cada
- Apenas letras MAIÚSCULAS (converter acentos: Á→A, É→E, Í→I, Ó→O, Ú→U, Ç→C)
- Sem espaços ou hífens
- Cada palavra da lista DEVE aparecer em MAIÚSCULAS na descrição

Responda APENAS em formato JSON:
{
  "description": "Seu parágrafo educativo aqui com as PALAVRAS em MAIÚSCULAS",
  "words": [
    {"word": "PALAVRA1", "clue": ""},
    {"word": "PALAVRA2", "clue": ""}
  ]
}

VERIFICAÇÃO FINAL:
- Conte as palavras em MAIÚSCULAS na descrição: devem ser ${wordCount}
- Cada item do array "words" deve aparecer em MAIÚSCULAS na "description"`;
}

function buildWordsearchPromptWithDocument(
  theme: string,
  documentText: string,
  wordCount: number,
  maxLength: number
): string {
  const truncatedDoc = documentText.substring(0, 12000);

  return `Você é um criador de caça-palavras educativos em português brasileiro.

Tema principal: "${theme}"

DOCUMENTO DE REFERÊNCIA:
"""
${truncatedDoc}
"""

TAREFA: Criar um caça-palavras com ${wordCount} palavras E uma descrição educativa baseada no documento.

=== PASSO 1: CRIAR A DESCRIÇÃO PRIMEIRO ===
Escreva um parágrafo educativo (200-400 caracteres) que:
- Resuma informações importantes do documento
- Contenha EXATAMENTE ${wordCount} palavras-chave em MAIÚSCULAS integradas no texto
- As palavras em MAIÚSCULAS serão as palavras do caça-palavras
- O texto deve ser fluido e fazer sentido

EXEMPLO (tema: hormônios):
"A GRELINA é um hormônio peptídico produzido principalmente pelas CÉLULAS do ESTÔMAGO, que ajuda na regulação do APETITE e do metabolismo energético. Descoberta em 1999 por pesquisadores JAPONESES, ficou conhecida como hormônio da FOME, por estimular a sensação de fome e aumentar a ingestão ALIMENTAR."

Palavras do exemplo: GRELINA, CÉLULAS, ESTÔMAGO, APETITE, JAPONESES, FOME, ALIMENTAR (7 palavras)

=== PASSO 2: EXTRAIR AS PALAVRAS ===
Depois de escrever a descrição, liste as palavras em MAIÚSCULAS que aparecem nela.

REGRAS PARA AS PALAVRAS:
- Entre 4 e ${maxLength} letras cada
- Apenas letras MAIÚSCULAS (converter acentos: Á→A, É→E, Í→I, Ó→O, Ú→U, Ç→C)
- Sem espaços ou hífens
- Priorize termos técnicos e conceitos-chave do documento
- Cada palavra da lista DEVE aparecer em MAIÚSCULAS na descrição

Responda APENAS em formato JSON:
{
  "description": "Seu parágrafo educativo aqui com as PALAVRAS em MAIÚSCULAS",
  "words": [
    {"word": "PALAVRA1", "clue": ""},
    {"word": "PALAVRA2", "clue": ""}
  ]
}

VERIFICAÇÃO FINAL:
- Conte as palavras em MAIÚSCULAS na descrição: devem ser ${wordCount}
- Cada item do array "words" deve aparecer em MAIÚSCULAS na "description"`;
}

function parseGeminiResponse(text: string, gameType: GameType): GeminiWordResponse {
  try {
    // Remove possíveis backticks de código
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanedText);

    const words: GeneratedWord[] = parsed.words.map((w: { word: string; clue: string }) => ({
      word: w.word.toUpperCase().replace(/[^A-Z]/g, ''),
      clue: w.clue || '',
      selected: true,
    }));

    const description = parsed.description || '';

    return {
      words,
      description,
    };
  } catch (error) {
    console.error('Erro ao parsear resposta:', error);
    throw new Error('Resposta inválida do Gemini');
  }
}

/**
 * Gera uma descrição educativa para caça-palavras que integra todas as palavras em MAIÚSCULAS
 */
export async function generateWordsearchDescription(
  theme: string,
  words: string[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const wordList = words.join(', ');

  const prompt = `Escreva um parágrafo educativo em português brasileiro sobre "${theme}".

REQUISITOS OBRIGATÓRIOS:
1. O parágrafo deve ter entre 200 e 400 caracteres
2. TODAS estas palavras devem aparecer em MAIÚSCULAS no texto: ${wordList}
3. O texto deve ser fluido, informativo e fazer sentido
4. Não liste as palavras - integre-as naturalmente no texto

EXEMPLO de formato correto (tema: hormônios da fome):
"A GRELINA é um hormônio peptídico produzido principalmente pelas CÉLULAS do ESTÔMAGO, que ajuda na regulação do APETITE e do metabolismo energético. Descoberta em 1999 por pesquisadores JAPONESES, ficou conhecida como hormônio da FOME, por estimular a sensação de fome e aumentar a ingestão ALIMENTAR."

Agora escreva um parágrafo sobre "${theme}" usando OBRIGATORIAMENTE todas estas palavras em MAIÚSCULAS: ${wordList}

Responda APENAS com o parágrafo, sem explicações.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let description = response.text().trim();

    // Remove aspas se o Gemini colocar
    description = description.replace(/^["']|["']$/g, '');

    return description;
  } catch (error) {
    console.error('Erro ao gerar descrição:', error);
    // Fallback: criar descrição simples
    return `Encontre as palavras relacionadas ao tema "${theme}": ${wordList}.`;
  }
}

/**
 * Regenera uma palavra específica
 */
export async function regenerateWord(
  theme: string,
  existingWords: string[],
  maxLength: number,
  needClue: boolean,
  sourceType: SourceType = 'gemini',
  documentText?: string | null
): Promise<GeneratedWord> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  let contextPart = '';
  if ((sourceType === 'document' || sourceType === 'both') && documentText) {
    const truncatedDoc = documentText.substring(0, 8000);
    contextPart = `

Contexto do documento:
"""
${truncatedDoc}
"""

Use este documento como referência para escolher a palavra.`;
  }

  const prompt = `Gere UMA nova palavra em português brasileiro relacionada ao tema "${theme}".
${contextPart}
Regras:
- Máximo ${maxLength} letras
- Apenas letras MAIÚSCULAS (sem acentos, espaços, hífens)
- NÃO use estas palavras: ${existingWords.join(', ')}
${needClue ? '- Inclua uma pista/definição criativa (max 60 caracteres)' : ''}

Responda APENAS em JSON:
{"word": "PALAVRA", "clue": "${needClue ? 'Pista aqui' : ''}"}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanedText);

    return {
      word: parsed.word.toUpperCase().replace(/[^A-Z]/g, ''),
      clue: parsed.clue || '',
      selected: true,
    };
  } catch (error) {
    console.error('Erro ao regenerar palavra:', error);
    throw new Error('Falha ao regenerar palavra');
  }
}
