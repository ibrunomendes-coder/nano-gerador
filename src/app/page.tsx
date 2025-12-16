'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ConfigForm, { SourceType } from '@/components/ConfigForm';
import WordList from '@/components/WordList';
import CrosswordPreview from '@/components/CrosswordPreview';
import WordSearchPreview from '@/components/WordSearchPreview';
import SudokuPreview from '@/components/SudokuPreview';
import SoletraPreview from '@/components/SoletraPreview';
import PuzzleHistory from '@/components/PuzzleHistory';
import { usePuzzleHistory } from '@/hooks/usePuzzleHistory';
import { generateCrossword } from '@/lib/generators/crossword';
import { generateWordSearch } from '@/lib/generators/wordsearch';
import { generateSudoku } from '@/lib/generators/sudoku';
import { generateSoletra } from '@/lib/generators/soletra';
import { downloadJson, copyJsonToClipboard, generateSlug } from '@/lib/export';
import {
  GameType,
  Difficulty,
  GeneratedWord,
  CrosswordPuzzle,
  WordSearchPuzzle,
  SudokuPuzzle,
  SoletraPuzzle,
  GRID_CONFIGS,
  GAME_TYPE_LABELS,
  PuzzleHistoryItem,
} from '@/types';
import { SavedGame } from '@/lib/games';

type Step = 'config' | 'words' | 'preview';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Estado do fluxo
  const [step, setStep] = useState<Step>('config');

  // ID do jogo sendo editado (se carregado de rascunho)
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);

  // Descrição educativa (para caça-palavras)
  const [description, setDescription] = useState('');
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // Puzzle gerado
  const [puzzle, setPuzzle] = useState<CrosswordPuzzle | WordSearchPuzzle | SudokuPuzzle | SoletraPuzzle | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [isFree, setIsFree] = useState(false);

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Historico
  const { history, addToHistory, updateItem, deleteItem, isLoaded } = usePuzzleHistory();

  // Carrega jogo do localStorage se veio da página /jogos
  useEffect(() => {
    const savedGame = localStorage.getItem('continue-game');
    if (savedGame) {
      try {
        const game: SavedGame = JSON.parse(savedGame);
        setEditingGameId(game.id);
        setGameType(game.gameType);
        setDifficulty(game.difficulty);
        setTitle(game.title);
        setTheme(game.theme);
        setDescription(game.description || '');
        setWords(game.words || []);
        if (game.puzzle) {
          setPuzzle(game.puzzle);
          setStep('preview');
        } else if (game.words?.length > 0) {
          setStep('words');
        }
        localStorage.removeItem('continue-game');
      } catch (e) {
        console.error('Erro ao carregar jogo:', e);
      }
    }
  }, []);

  // Salva rascunho (com feedback visual)
  const handleSaveDraft = async () => {
    if (!session?.user) {
      setError('Você precisa estar logado para salvar rascunhos');
      return;
    }

    setIsSaving(true);
    setError(null);

    const success = await saveAsDraft();
    setIsSaving(false);

    if (success) {
      alert('Jogo salvo com sucesso!');
    } else {
      setError('Erro ao salvar jogo');
    }
  };

  // Gera palavras (ou puzzle diretamente para Sudoku)
  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Sudoku é gerado localmente sem precisar de IA
      if (gameType === 'sudoku') {
        const sudokuTitle = title || `Sudoku ${GAME_TYPE_LABELS[gameType]}`;
        const sudokuPuzzle = generateSudoku(difficulty, sudokuTitle);
        setPuzzle(sudokuPuzzle);
        addToHistory(sudokuPuzzle, gameType, difficulty, sudokuTitle, '');
        setStep('preview');
        setIsLoading(false);
        return;
      }

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

  // Gera mais palavras (adiciona às existentes)
  const handleGenerateMore = async (count: number = 5) => {
    setIsGeneratingMore(true);
    setError(null);

    try {
      const existingWords = words.map(w => w.word);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType,
          difficulty,
          theme,
          sourceType,
          documentText,
          additionalCount: count,
          existingWords, // Para evitar duplicatas
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar mais palavras');
      }

      // Filtra palavras que já existem e adiciona as novas
      const newWords = data.words
        .filter((w: GeneratedWord) => !existingWords.includes(w.word))
        .map((w: GeneratedWord) => ({
          ...w,
          selected: true,
        }));

      if (newWords.length === 0) {
        setError('Não foi possível gerar palavras novas. Tente novamente.');
        return;
      }

      setWords([...words, ...newWords]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsGeneratingMore(false);
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
  const handleCreatePuzzle = async () => {
    const config = GRID_CONFIGS[gameType][difficulty];

    let newPuzzle: CrosswordPuzzle | WordSearchPuzzle | SoletraPuzzle | null;

    if (gameType === 'crossword') {
      const crosswordDescription = `${GAME_TYPE_LABELS[gameType]} sobre ${theme || title}`;
      newPuzzle = generateCrossword(words, config, crosswordDescription, title);
    } else if (gameType === 'wordsearch') {
      // Para caça-palavras, usa a descrição educativa ou fallback
      const wordsearchDescription = description || `Encontre as palavras relacionadas ao tema "${theme || title}".`;
      newPuzzle = generateWordSearch(words, config, wordsearchDescription, title);
    } else if (gameType === 'soletra') {
      // Para Soletra, usa IA para escolher letras e palavras do dicionário
      setIsLoading(true);
      try {
        newPuzzle = await generateSoletra(words, difficulty, title, theme);
        if (!newPuzzle) {
          setError('Não foi possível gerar o Soletra. Tente um tema diferente.');
          return;
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      return; // Sudoku já é tratado em handleGenerate
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

  // Volta para etapa anterior (salva rascunho automaticamente se tiver palavras)
  const handleBack = async () => {
    if (step === 'words') {
      // Salva automaticamente como rascunho se tiver palavras e usuário logado
      if (session?.user && words.length > 0) {
        await saveAsDraft();
      }
      setStep('config');
    } else if (step === 'preview') {
      // Sudoku não tem etapa de palavras, volta direto para config
      if (gameType === 'sudoku') {
        setStep('config');
      } else {
        setStep('words');
      }
      setPuzzle(null);
    }
  };

  // Função interna para salvar rascunho (sem alert) - retorna true se sucesso
  const saveAsDraft = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingGameId,
          title: title || 'Sem título',
          theme,
          gameType,
          difficulty,
          status: puzzle ? 'complete' : 'draft',
          words,
          description,
          puzzle,
        }),
      });

      const data = await response.json();
      if (response.ok && data.game?.id) {
        setEditingGameId(data.game.id);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao salvar rascunho:', err);
      return false;
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
    setEditingGameId(null); // Limpa o ID para criar novo jogo
  };

  const selectedWordCount = words.filter((w) => w.selected).length;
  const config = GRID_CONFIGS[gameType][difficulty];

  // Mostra loading enquanto verifica sessão
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#E5E5E5] flex items-center justify-center">
        <div className="text-center">
          <svg className="w-8 h-8 animate-spin text-[#7B9E89] mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-neutral-500">Carregando...</p>
        </div>
      </div>
    );
  }

  // Não renderiza nada enquanto redireciona
  if (status === 'unauthenticated') {
    return null;
  }

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

            {/* Botão para gerar mais palavras */}
            <div className="bg-white p-4 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">
                  Precisa de mais palavras?
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerateMore(5)}
                    disabled={isGeneratingMore}
                    className={`px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${
                      isGeneratingMore
                        ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                        : 'bg-[#7B9E89] text-white hover:bg-[#6B8E79]'
                    }`}
                  >
                    {isGeneratingMore ? (
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        +5 Palavras
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleGenerateMore(10)}
                    disabled={isGeneratingMore}
                    className={`px-4 py-2 text-sm font-medium transition-all ${
                      isGeneratingMore
                        ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                        : 'border border-[#7B9E89] text-[#7B9E89] hover:bg-[#7B9E89]/10'
                    }`}
                  >
                    +10 Palavras
                  </button>
                </div>
              </div>
            </div>

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

                  {/* Botão Salvar Rascunho */}
                  {session?.user && (
                    <button
                      onClick={handleSaveDraft}
                      disabled={isSaving || words.length === 0}
                      className={`px-4 py-2 font-medium transition-all flex items-center gap-2 ${
                        isSaving || words.length === 0
                          ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                          : 'border border-[#D4A843] text-[#D4A843] hover:bg-[#D4A843]/10'
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Salvando...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                          </svg>
                          Salvar Rascunho
                        </>
                      )}
                    </button>
                  )}

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
            ) : gameType === 'wordsearch' ? (
              <WordSearchPreview
                puzzle={puzzle as WordSearchPuzzle}
                showAnswers={showAnswers}
              />
            ) : gameType === 'sudoku' ? (
              <SudokuPreview
                puzzle={puzzle as SudokuPuzzle}
                showAnswers={showAnswers}
              />
            ) : (
              <SoletraPreview
                puzzle={puzzle as SoletraPuzzle}
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
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
                  >
                    Voltar
                  </button>

                  {/* Botão Salvar */}
                  {session?.user && (
                    <button
                      onClick={handleSaveDraft}
                      disabled={isSaving}
                      className={`px-4 py-2 font-medium transition-all flex items-center gap-2 ${
                        isSaving
                          ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                          : 'border border-[#D4A843] text-[#D4A843] hover:bg-[#D4A843]/10'
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Salvando...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                          </svg>
                          Salvar
                        </>
                      )}
                    </button>
                  )}

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
