'use client';

import {
  GameType,
  Difficulty,
  GAME_TYPE_LABELS,
  DIFFICULTY_LABELS,
  GRID_CONFIGS,
} from '@/types';
import DocumentUpload from './DocumentUpload';

export type SourceType = 'gemini' | 'document' | 'both';

interface ConfigFormProps {
  gameType: GameType;
  setGameType: (type: GameType) => void;
  difficulty: Difficulty;
  setDifficulty: (diff: Difficulty) => void;
  theme: string;
  setTheme: (theme: string) => void;
  title: string;
  setTitle: (title: string) => void;
  sourceType: SourceType;
  setSourceType: (source: SourceType) => void;
  documentText: string | null;
  setDocumentText: (text: string | null) => void;
  documentName: string | null;
  setDocumentName: (name: string | null) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

const SOURCE_OPTIONS: { value: SourceType; label: string; description: string }[] = [
  { value: 'gemini', label: 'Gemini AI', description: 'Gera palavras com base no tema usando IA' },
  { value: 'document', label: 'Documento', description: 'Extrai palavras de um documento enviado' },
  { value: 'both', label: 'Ambos', description: 'Combina documento + IA para melhores resultados' },
];

export default function ConfigForm({
  gameType,
  setGameType,
  difficulty,
  setDifficulty,
  theme,
  setTheme,
  title,
  setTitle,
  sourceType,
  setSourceType,
  documentText,
  setDocumentText,
  documentName,
  setDocumentName,
  onGenerate,
  isLoading,
}: ConfigFormProps) {
  const config = GRID_CONFIGS[gameType][difficulty];

  const handleDocumentProcessed = (text: string, fileName: string) => {
    setDocumentText(text);
    setDocumentName(fileName);
  };

  const handleRemoveDocument = () => {
    setDocumentText(null);
    setDocumentName(null);
    if (sourceType === 'document') {
      setSourceType('gemini');
    }
  };

  // Validação para habilitar o botão
  const canGenerate = () => {
    if (!title.trim()) return false;

    // Sudoku só precisa do título
    if (gameType === 'sudoku') return true;

    switch (sourceType) {
      case 'gemini':
        return theme.trim().length > 0;
      case 'document':
        return documentText !== null;
      case 'both':
        return theme.trim().length > 0 && documentText !== null;
      default:
        return false;
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 space-y-8">
      <h2 className="text-xl font-medium text-neutral-900">Configuracao do Passatempo</h2>

      {/* Tipo de Jogo */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-3">
          Tipo de Jogo
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(Object.keys(GAME_TYPE_LABELS) as GameType[]).map((type) => {
            const colors: Record<GameType, string> = {
              crossword: '#E8B4B4',
              wordsearch: '#D4A843',
              sudoku: '#7B9E89',
              soletra: '#C5E0DC',
            };
            const icons: Record<GameType, string> = {
              crossword: '+',
              wordsearch: '#',
              sudoku: '9',
              soletra: '🐝',
            };
            return (
              <button
                key={type}
                onClick={() => setGameType(type)}
                className={`p-6 border-2 transition-all ${
                  gameType === type
                    ? `border-[${colors[type]}] bg-[${colors[type]}]/20`
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
                style={gameType === type ? {
                  borderColor: colors[type],
                  backgroundColor: `${colors[type]}33`,
                } : undefined}
              >
                <div className="text-2xl mb-2 text-neutral-700">{icons[type]}</div>
                <div className="font-medium text-neutral-900">{GAME_TYPE_LABELS[type]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dificuldade */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-3">
          Dificuldade
        </label>
        <div className="grid grid-cols-3 gap-4">
          {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((diff) => (
            <button
              key={diff}
              onClick={() => setDifficulty(diff)}
              className={`p-4 border-2 transition-all ${
                difficulty === diff
                  ? 'border-[#7B9E89] bg-[#7B9E89]/10'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="font-medium text-neutral-900">{DIFFICULTY_LABELS[diff]}</div>
              <div className="text-xs text-neutral-500 mt-1">
                {GRID_CONFIGS[gameType][diff].width}x{GRID_CONFIGS[gameType][diff].height}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Info da Grade */}
      <div className="bg-neutral-50 p-4">
        <h3 className="text-xs text-neutral-400 uppercase tracking-widest mb-3">
          Configuracao da Grade
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-neutral-500">{gameType === 'soletra' ? 'Letras:' : 'Tamanho:'}</span>{' '}
            <span className="font-medium text-neutral-900">
              {gameType === 'soletra' ? '7 (1 central + 6)' : `${config.width} x ${config.height}`}
            </span>
          </div>
          <div>
            <span className="text-neutral-500">{gameType === 'sudoku' ? 'Pistas:' : gameType === 'soletra' ? 'Palavras válidas:' : 'Palavras:'}</span>{' '}
            <span className="font-medium text-neutral-900">{config.minWords} - {config.maxWords}</span>
          </div>
          <div>
            <span className="text-neutral-500">Tempo:</span>{' '}
            <span className="font-medium text-neutral-900">{config.estimatedTime} min</span>
          </div>
        </div>
      </div>

      {/* Titulo */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Titulo do Passatempo
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Animais da Floresta"
          className="w-full px-4 py-3 bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#7B9E89] focus:border-transparent transition-colors"
        />
      </div>

      {/* Fonte das Palavras - não mostrar para Sudoku */}
      {gameType !== 'sudoku' && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-3">
            Fonte das Palavras
          </label>
          <div className="grid grid-cols-3 gap-3">
            {SOURCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSourceType(option.value)}
                disabled={option.value !== 'gemini' && !documentText && option.value === 'document'}
                className={`p-4 border-2 transition-all text-left ${
                  sourceType === option.value
                    ? 'border-[#7B9E89] bg-[#7B9E89]/10'
                    : 'border-neutral-200 hover:border-neutral-300'
                } ${option.value !== 'gemini' && !documentText && option.value === 'document' ? 'opacity-50' : ''}`}
              >
                <div className="font-medium text-neutral-900 text-sm">{option.label}</div>
                <div className="text-xs text-neutral-500 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload de Documento - não mostrar para Sudoku */}
      {gameType !== 'sudoku' && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Documento Base <span className="text-neutral-400 font-normal">(opcional)</span>
          </label>
          <DocumentUpload
            onDocumentProcessed={handleDocumentProcessed}
            onRemove={handleRemoveDocument}
            fileName={documentName}
            isProcessing={false}
            setIsProcessing={() => {}}
          />
          {documentText && (
            <p className="mt-2 text-xs text-neutral-500">
              {documentText.length.toLocaleString()} caracteres extraídos
            </p>
          )}
        </div>
      )}

      {/* Tema - apenas se usar Gemini e não for Sudoku */}
      {gameType !== 'sudoku' && (sourceType === 'gemini' || sourceType === 'both') && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Tema para geracao de palavras
            {sourceType === 'both' && (
              <span className="text-neutral-400 font-normal ml-1">(combina com documento)</span>
            )}
          </label>
          <textarea
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder={
              sourceType === 'both'
                ? 'Descreva o tema. O Gemini usará o documento como contexto adicional...'
                : 'Descreva o tema para o Gemini gerar palavras relacionadas...'
            }
            rows={3}
            className="w-full px-4 py-3 bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#7B9E89] focus:border-transparent transition-colors resize-none"
          />
        </div>
      )}

      {/* Info especial para Sudoku */}
      {gameType === 'sudoku' && (
        <div className="bg-[#7B9E89]/10 border border-[#7B9E89]/30 p-4">
          <p className="text-sm text-neutral-700">
            <strong>Sudoku</strong> é gerado automaticamente usando algoritmos matemáticos.
            Não requer tema ou palavras - apenas selecione a dificuldade desejada.
          </p>
        </div>
      )}

      {/* Info especial para Soletra */}
      {gameType === 'soletra' && (
        <div className="bg-[#C5E0DC]/30 border border-[#8BBDB5]/50 p-4">
          <p className="text-sm text-neutral-700">
            <strong>Soletra</strong> (estilo Spelling Bee): 7 letras formam um hexágono.
            A letra central deve aparecer em todas as palavras. Gere um tema com bastante
            variedade de palavras para melhores resultados.
          </p>
        </div>
      )}

      {/* Botao Gerar */}
      <button
        onClick={onGenerate}
        disabled={isLoading || !canGenerate()}
        className={`w-full py-4 px-4 font-medium transition-all ${
          isLoading || !canGenerate()
            ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
            : 'bg-[#7B9E89] text-white hover:bg-[#6B8E79]'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {gameType === 'sudoku'
              ? 'Gerando Sudoku...'
              : sourceType === 'document'
              ? 'Extraindo palavras...'
              : 'Gerando com Gemini...'}
          </span>
        ) : (
          gameType === 'sudoku' ? 'Gerar Sudoku' : 'Gerar Palavras'
        )}
      </button>
    </div>
  );
}
