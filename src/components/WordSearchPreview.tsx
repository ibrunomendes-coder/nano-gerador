'use client';

import { WordSearchPuzzle } from '@/types';

interface WordSearchPreviewProps {
  puzzle: WordSearchPuzzle;
  showAnswers: boolean;
}

/**
 * Formata a descrição destacando palavras em MAIÚSCULAS
 */
function formatDescription(description: string): React.ReactNode {
  // Regex para encontrar palavras em MAIÚSCULAS (2+ letras consecutivas)
  const parts = description.split(/(\b[A-ZÀÁÂÃÄÇÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜ]{2,}\b)/g);

  return parts.map((part, index) => {
    // Verifica se é uma palavra em maiúsculas
    if (/^[A-ZÀÁÂÃÄÇÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜ]{2,}$/.test(part)) {
      return (
        <span key={index} className="font-semibold text-neutral-800">
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function WordSearchPreview({ puzzle, showAnswers }: WordSearchPreviewProps) {
  const { content, answer, suggestions, name, description } = puzzle;
  const grid = showAnswers ? answer : content;

  // Determina tamanho da celula baseado na grade
  const gridWidth = content[0]?.split(' ').length || 10;
  const cellSize = Math.min(32, 500 / gridWidth);

  return (
    <div className="bg-white p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-medium text-neutral-900">{name}</h2>
        <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
          {formatDescription(description)}
        </p>
      </div>

      {/* Grade */}
      <div className="flex justify-center mb-8">
        <div
          className="grid gap-0 border-2 border-neutral-800 bg-white"
          style={{
            gridTemplateColumns: `repeat(${gridWidth}, ${cellSize}px)`,
          }}
        >
          {grid.map((row, y) =>
            row.split(' ').map((letter, x) => {
              const isWordLetter = showAnswers && letter !== '-';
              return (
                <div
                  key={`${x}-${y}`}
                  className={`flex items-center justify-center border border-neutral-200 font-mono font-bold ${
                    isWordLetter ? 'bg-[#D4A843]/30 text-neutral-800' : 'text-neutral-700'
                  }`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    fontSize: cellSize * 0.5,
                  }}
                >
                  {showAnswers ? (letter === '-' ? content[y].split(' ')[x] : letter) : letter}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Palavras */}
      <div>
        <h3 className="text-xs text-neutral-400 uppercase tracking-widest mb-4">Encontre as palavras</h3>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((word) => (
            <span
              key={word}
              className="px-3 py-1.5 bg-neutral-100 text-sm font-medium text-neutral-700"
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
