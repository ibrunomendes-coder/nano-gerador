'use client';

import { useState } from 'react';
import {
  PuzzleHistoryItem,
  GameType,
  GAME_TYPE_LABELS,
  DIFFICULTY_LABELS,
  CrosswordPuzzle,
  WordSearchPuzzle,
  SudokuPuzzle,
  SoletraPuzzle,
} from '@/types';
import { downloadJson, copyJsonToClipboard } from '@/lib/export';

interface PuzzleHistoryProps {
  items: PuzzleHistoryItem[];
  onUpdateItem: (id: string, updates: Partial<PuzzleHistoryItem>) => void;
  onDeleteItem: (id: string) => void;
  onLoadItem: (item: PuzzleHistoryItem) => void;
}

export default function PuzzleHistory({
  items,
  onUpdateItem,
  onDeleteItem,
  onLoadItem,
}: PuzzleHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="border border-neutral-300 bg-white p-6 text-center">
        <p className="text-neutral-500">Nenhum passatempo gerado ainda.</p>
        <p className="text-neutral-400 text-sm mt-2">
          Os passatempos gerados aparecerão aqui.
        </p>
      </div>
    );
  }

  const handleCopyJson = async (item: PuzzleHistoryItem) => {
    const success = await copyJsonToClipboard(item.puzzle, item.gameType);
    if (success) {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDownloadJson = (item: PuzzleHistoryItem) => {
    const filenames: Record<GameType, string> = {
      crossword: `cruzada_${item.id}`,
      wordsearch: `cacapalavras_${item.id}`,
      sudoku: `sudoku_${item.id}`,
      soletra: `soletra_${item.id}`,
    };
    downloadJson(item.puzzle, item.gameType, filenames[item.gameType]);
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getWordCount = (puzzle: CrosswordPuzzle | WordSearchPuzzle | SudokuPuzzle | SoletraPuzzle, gameType: GameType) => {
    if (gameType === 'crossword') {
      return (puzzle as CrosswordPuzzle).word?.length || 0;
    }
    if (gameType === 'wordsearch') {
      return (puzzle as WordSearchPuzzle).suggestions?.length || 0;
    }
    if (gameType === 'sudoku') {
      return (puzzle as SudokuPuzzle).clueCount || 0;
    }
    if (gameType === 'soletra') {
      return (puzzle as SoletraPuzzle).validWords?.length || 0;
    }
    return 0;
  };

  return (
    <div className="border border-neutral-300 bg-white">
      <div className="border-b border-neutral-300 px-4 py-3 bg-neutral-50">
        <h3 className="font-semibold text-neutral-900">
          Historico de Passatempos ({items.length})
        </h3>
      </div>

      <div className="divide-y divide-neutral-200 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="p-4">
            {/* Header row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="px-2 py-0.5 text-xs font-medium text-neutral-800"
                    style={{
                      backgroundColor: {
                        crossword: '#E8B4B4',
                        wordsearch: '#D4A843',
                        sudoku: '#7B9E89',
                        soletra: '#C5E0DC',
                      }[item.gameType],
                    }}
                  >
                    {GAME_TYPE_LABELS[item.gameType]}
                  </span>
                  <span className="px-2 py-0.5 text-xs bg-neutral-200 text-neutral-700">
                    {DIFFICULTY_LABELS[item.difficulty]}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {getWordCount(item.puzzle, item.gameType)} {item.gameType === 'sudoku' ? 'pistas' : 'palavras'}
                  </span>
                </div>

                <h4 className="font-medium text-neutral-900 mt-1 truncate">
                  {item.title || 'Sem título'}
                </h4>

                <p className="text-sm text-neutral-500 truncate">
                  {item.theme || 'Sem tema'}
                </p>

                <p className="text-xs text-neutral-400 mt-1">
                  {formatDate(item.createdAt)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  className="text-xs px-3 py-1 border border-neutral-300 hover:bg-neutral-100 text-neutral-700"
                >
                  {expandedId === item.id ? 'Fechar' : 'Detalhes'}
                </button>
              </div>
            </div>

            {/* Status checkboxes */}
            <div className="flex items-center gap-6 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.isTested}
                  onChange={(e) => onUpdateItem(item.id, { isTested: e.target.checked })}
                  className="w-4 h-4 accent-[#7B9E89]"
                />
                <span className={`text-sm ${item.isTested ? 'text-[#6B8E79] font-medium' : 'text-neutral-600'}`}>
                  Testado
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.isPublished}
                  onChange={(e) => onUpdateItem(item.id, { isPublished: e.target.checked })}
                  className="w-4 h-4 accent-[#7B9E89]"
                />
                <span className={`text-sm ${item.isPublished ? 'text-[#6B8E79] font-medium' : 'text-neutral-600'}`}>
                  Publicado
                </span>
              </label>

              {/* Status badges */}
              {item.isTested && item.isPublished && (
                <span className="text-xs px-2 py-0.5 bg-[#7B9E89] text-white">
                  Completo
                </span>
              )}
            </div>

            {/* Expanded details */}
            {expandedId === item.id && (
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCopyJson(item)}
                    className="text-xs px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300"
                  >
                    {copiedId === item.id ? 'Copiado!' : 'Copiar JSON'}
                  </button>

                  <button
                    onClick={() => handleDownloadJson(item)}
                    className="text-xs px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300"
                  >
                    Baixar JSON
                  </button>

                  <button
                    onClick={() => onLoadItem(item)}
                    className="text-xs px-3 py-1.5 bg-[#7B9E89] hover:bg-[#6B8E79] text-white"
                  >
                    Carregar no Editor
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Tem certeza que deseja excluir este passatempo?')) {
                        onDeleteItem(item.id);
                      }
                    }}
                    className="text-xs px-3 py-1.5 bg-[#E8B4B4] hover:bg-[#D4A4A4] text-neutral-800 border border-[#D4A4A4]"
                  >
                    Excluir
                  </button>
                </div>

                {/* Preview info */}
                <div className="mt-3 text-xs text-neutral-500">
                  <p>ID: {item.id}</p>
                  {item.gameType === 'crossword' && (
                    <p>
                      Grade: {(item.puzzle as CrosswordPuzzle).grid.width}x
                      {(item.puzzle as CrosswordPuzzle).grid.height}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
