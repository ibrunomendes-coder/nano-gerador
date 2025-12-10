'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import ConfigForm, { SourceType } from '@/components/ConfigForm';
import WordList from '@/components/WordList';
import CrosswordPreview from '@/components/CrosswordPreview';
import WordSearchPreview from '@/components/WordSearchPreview';
import PuzzleHistory from '@/components/PuzzleHistory';
import { usePuzzleHistory } from '@/hooks/usePuzzleHistory';
import { generateCrossword } from '@/lib/generators/crossword';
import { generateWordSearch } from '@/lib/generators/wordsearch';
import { downloadJson, copyJsonToClipboard, generateSlug } from '@/lib/export';
import {
  GameType,
  Difficulty,
  GeneratedWord,
  CrosswordPuzzle,
  WordSearchPuzzle,
  GRID_CONFIGS,
  GAME_TYPE_LABELS,
  PuzzleHistoryItem,
} from '@/types';

type Step = 'config' | 'words' | 'preview';

export default function Home() {
  // Estado do fluxo
  const [step, setStep] = useState<Step>('config');

  // Configuracao
  const [gameType, setGameType] = useState<GameType>('crossword');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [theme, setTheme] = useState('');
  const [title, setTitle] = useState('');

  // Fonte das palavras
  const [sourceType, setSourceType] = useState<SourceType>('gemini');
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);

  // Palavras geradas
  const [words, setWords] = useState<GeneratedWord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState<number | null>(null);

  // Descrição educativa (para caça-palavras)
  const [description, setDescription] = useState('');
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // Puzzle gerado
  const [puzzle, setPuzzle] = useState<CrosswordPuzzle | WordSearchPuzzle | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [isFree, setIsFree] = useState(false);

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Historico
  const { history, addToHistory, updateItem, deleteItem, isLoaded } = usePuzzleHistory();

  // Gera palavras
  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType,
          difficulty,
          theme,
          sourceType,
          documentText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar palavras');
      }

      // Marca todas as palavras como selecionadas
      const generatedWords = data.words.map((w: GeneratedWord) => ({
        ...w,
        selected: true,
      }));

      setWords(generatedWords);
      setStep('words');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  // Gera descrição educativa para caça-palavras
  const handleGenerateDescription = async () => {
    setIsGeneratingDescription(true);
    setError(null);

    try {
      const selectedWords = words.filter(w => w.selected).map(w => w.word);

      const response = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: theme || title,
          words: selectedWords,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar descrição');
      }

      setDescription(data.description);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar descrição');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Regenera uma palavra especifica
  const handleRegenerate = async (index: number) => {
    setIsRegenerating(index);
    setError(null);

    try {
      const existingWords = words.map((w) => w.word);
      const config = GRID_CONFIGS[gameType][difficulty];

      const response = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          existingWords,
          maxLength: gameType === 'crossword' ? config.width : config.width - 2,
          needClue: gameType === 'crossword',
          documentText,
          sourceType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao regenerar palavra');
      }

      // Substitui a palavra no índice
      const newWords = [...words];
      newWords[index] = {
        word: data.word,
        clue: data.clue || '',
        selected: true,
      };
      setWords(newWords);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao regenerar');
    } finally {
      setIsRegenerating(null);
    }
  };

  // Gera o puzzle final
  const handleCreatePuzzle = () => {
    const config = GRID_CONFIGS[gameType][difficulty];

    let newPuzzle: CrosswordPuzzle | WordSearchPuzzle;

    if (gameType === 'crossword') {
      const crosswordDescription = `${GAME_TYPE_LABELS[gameType]} sobre ${theme || title}`;
      newPuzzle = generateCrossword(words, config, crosswordDescription, title);
    } else {
      // Para caça-palavras, usa a descrição educativa ou fallback
      const wordsearchDescription = description || `Encontre as palavras relacionadas ao tema "${theme || title}".`;
      newPuzzle = generateWordSearch(words, config, wordsearchDescription, title);
    }

    setPuzzle(newPuzzle);

    // Salva no historico
    addToHistory(newPuzzle, gameType, difficulty, title, theme);

    setStep('preview');
  };

  // Carrega um puzzle do historico
  const handleLoadFromHistory = (item: PuzzleHistoryItem) => {
    setGameType(item.gameType);
    setDifficulty(item.difficulty);
    setTitle(item.title);
    setTheme(item.theme);
    setPuzzle(item.puzzle);
    setStep('preview');
  };

  // Exporta como JSON
  const handleDownload = () => {
    if (!puzzle) return;
    const slug = generateSlug(title);
    const filename = `${gameType}_${slug}_${Date.now()}`;
    downloadJson(puzzle, gameType, filename, isFree);
  };

  // Copia para clipboard
  const handleCopy = async () => {
    if (!puzzle) return;
    const success = await copyJsonToClipboard(puzzle, gameType, isFree);
    setCopySuccess(success);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Volta para etapa anterior
  const handleBack = () => {
    if (step === 'words') {
      setStep('config');
    } else if (step === 'preview') {
      setStep('words');
      setPuzzle(null);
    }
  };

  // Recomeça
  const handleReset = () => {
    setStep('config');
    setWords([]);
    setPuzzle(null);
    setTheme('');
    setTitle('');
    setShowAnswers(false);
    setIsFree(false);
    setError(null);
    setSourceType('gemini');
    setDocumentText(null);
    setDocumentName(null);
    setDescription('');
  };

  const selectedWordCount = words.filter((w) => w.selected).length;
  const config = GRID_CONFIGS[gameType][difficulty];

  return (
    <div className="min-h-screen bg-[#E5E5E5] flex flex-col">
      {/* Header */}
      <Header onReset={handleReset} showReset={step !== 'config'} />

      {/* Indicador de etapas */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center gap-3 text-sm">
          <span
            className={`px-4 py-2 font-medium transition-all ${
              step === 'config'
                ? 'bg-[#7B9E89] text-white'
                : 'bg-neutral-200 text-neutral-600'
            }`}
          >
            1. Configurar
          </span>
          <span className="text-neutral-400">—</span>
          <span
            className={`px-4 py-2 font-medium transition-all ${
              step === 'words'
                ? 'bg-[#7B9E89] text-white'
                : step === 'preview'
                ? 'bg-neutral-200 text-neutral-600'
                : 'bg-neutral-100 text-neutral-400'
            }`}
          >
            2. Palavras
          </span>
          <span className="text-neutral-400">—</span>
          <span
            className={`px-4 py-2 font-medium transition-all ${
              step === 'preview'
                ? 'bg-[#7B9E89] text-white'
                : 'bg-neutral-100 text-neutral-400'
            }`}
          >
            3. Preview
          </span>
        </div>
      </div>

      {/* Conteudo principal */}
      <main className="flex-1 max-w-5xl mx-auto px-6 pb-8 w-full">
        {/* Mensagem de erro */}
        {error && (
          <div className="mb-6 p-4 bg-[#E8B4B4] border border-[#d9a0a0] text-neutral-800">
            {error}
          </div>
        )}

        {/* Etapa 1: Configuracao */}
        {step === 'config' && (
          <div className="space-y-8">
            <ConfigForm
              gameType={gameType}
              setGameType={setGameType}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              theme={theme}
              setTheme={setTheme}
              title={title}
              setTitle={setTitle}
              sourceType={sourceType}
              setSourceType={setSourceType}
              documentText={documentText}
              setDocumentText={setDocumentText}
              documentName={documentName}
              setDocumentName={setDocumentName}
              onGenerate={handleGenerate}
              isLoading={isLoading}
            />

            {/* Historico de passatempos */}
            {isLoaded && (
              <PuzzleHistory
                items={history}
                onUpdateItem={updateItem}
                onDeleteItem={deleteItem}
                onLoadItem={handleLoadFromHistory}
              />
            )}
          </div>
        )}

        {/* Etapa 2: Edicao de palavras */}
        {step === 'words' && (
          <div className="space-y-6">
            <WordList
              words={words}
              setWords={setWords}
              gameType={gameType}
              onRegenerate={handleRegenerate}
              isRegenerating={isRegenerating}
            />

            {/* Descrição educativa (apenas para caça-palavras) */}
            {gameType === 'wordsearch' && (
              <div className="bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-900">
                    Descrição Educativa
                  </h3>
                  <button
                    onClick={handleGenerateDescription}
                    disabled={isGeneratingDescription || selectedWordCount === 0}
                    className={`px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${
                      isGeneratingDescription || selectedWordCount === 0
                        ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                        : 'bg-[#D4A843] text-white hover:bg-[#C49733]'
                    }`}
                  >
                    {isGeneratingDescription ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Gerando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Gerar com IA
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mb-3">
                  Crie um parágrafo educativo que integre TODAS as palavras em MAIÚSCULAS. Exemplo: &quot;A GRELINA é um hormônio produzido pelas CÉLULAS do ESTÔMAGO...&quot;
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Digite ou gere uma descrição educativa que contenha todas as palavras do caça-palavras em MAIÚSCULAS..."
                  className="w-full h-32 px-4 py-3 border border-neutral-200 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-[#D4A843] resize-none"
                />
                {description && (
                  <div className="mt-3 text-xs text-neutral-500">
                    {words.filter(w => w.selected).filter(w => description.includes(w.word)).length} de {selectedWordCount} palavras encontradas na descrição
                  </div>
                )}
              </div>
            )}

            {/* Info e acoes */}
            <div className="bg-white p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-700">
                  <span className="font-medium text-neutral-900">{selectedWordCount}</span> palavras
                  selecionadas (minimo: {config.minWords})
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleCreatePuzzle}
                    disabled={selectedWordCount < config.minWords}
                    className={`px-6 py-2 font-medium transition-all ${
                      selectedWordCount >= config.minWords
                        ? 'bg-[#7B9E89] text-white hover:bg-[#6B8E79]'
                        : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    }`}
                  >
                    Gerar Passatempo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Etapa 3: Preview e exportacao */}
        {step === 'preview' && puzzle && (
          <div className="space-y-6">
            {/* Preview do puzzle */}
            {gameType === 'crossword' ? (
              <CrosswordPreview
                puzzle={puzzle as CrosswordPuzzle}
                showAnswers={showAnswers}
              />
            ) : (
              <WordSearchPreview
                puzzle={puzzle as WordSearchPuzzle}
                showAnswers={showAnswers}
              />
            )}

            {/* Controles */}
            <div className="bg-white p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Toggle respostas e free */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAnswers}
                      onChange={(e) => setShowAnswers(e.target.checked)}
                      className="w-4 h-4 accent-[#7B9E89]"
                    />
                    <span className="text-sm text-neutral-700">Mostrar respostas</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFree}
                      onChange={(e) => setIsFree(e.target.checked)}
                      className="w-4 h-4 accent-[#7B9E89]"
                    />
                    <span className="text-sm text-neutral-700">Gratuito</span>
                  </label>
                </div>

                {/* Botoes de acao */}
                <div className="flex gap-3">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-medium transition-colors flex items-center gap-2"
                  >
                    {copySuccess ? (
                      <>
                        <svg className="w-4 h-4 text-[#7B9E89]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copiado!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Copiar JSON
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-6 py-2 bg-[#7B9E89] text-white hover:bg-[#6B8E79] font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 mt-auto border-t border-neutral-300/50">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-neutral-500">
          nano passatempos — Gerador de jogos com Gemini AI
        </div>
      </footer>
    </div>
  );
}
