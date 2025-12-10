'use client';

import { useState } from 'react';
import { CrosswordPuzzle } from '@/types';

interface CrosswordPreviewProps {
  puzzle: CrosswordPuzzle;
  showAnswers: boolean;
}

export default function CrosswordPreview({ puzzle, showAnswers }: CrosswordPreviewProps) {
  const { grid, clues, metadata } = puzzle;
  const cellSize = Math.min(40, 500 / Math.max(grid.width, grid.height));

  // Estado para célula/palavra selecionada
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);

  // Cria mapa de celulas
  const cellMap = new Map<string, { solution?: string; type?: string }>();
  for (const cell of grid.cell) {
    cellMap.set(`${cell.x},${cell.y}`, { solution: cell.solution, type: cell.type });
  }

  // Cria mapa de numeros (posição inicial de cada palavra)
  const numberMap = new Map<string, string>();
  for (const w of puzzle.word) {
    // Pega apenas a primeira coordenada (antes do hífen se houver)
    const x = w.x.split('-')[0];
    const y = w.y.split('-')[0];
    numberMap.set(`${x},${y}`, w.id);
  }

  // Cria mapa de células que pertencem a cada palavra
  const wordCellsMap = new Map<string, Set<string>>();
  for (const w of puzzle.word) {
    const cells = new Set<string>();
    const xParts = w.x.split('-');
    const yParts = w.y.split('-');

    if (xParts.length === 2) {
      // Palavra horizontal
      const y = yParts[0];
      const startX = parseInt(xParts[0]);
      const endX = parseInt(xParts[1]);
      for (let x = startX; x <= endX; x++) {
        cells.add(`${x},${y}`);
      }
    } else if (yParts.length === 2) {
      // Palavra vertical
      const x = xParts[0];
      const startY = parseInt(yParts[0]);
      const endY = parseInt(yParts[1]);
      for (let y = startY; y <= endY; y++) {
        cells.add(`${x},${y}`);
      }
    } else {
      // Palavra de uma letra
      cells.add(`${xParts[0]},${yParts[0]}`);
    }

    wordCellsMap.set(w.id, cells);
  }

  // Cria mapa inverso: célula -> palavras que passam por ela
  const cellToWordsMap = new Map<string, string[]>();
  for (const [wordId, cells] of wordCellsMap) {
    for (const cell of cells) {
      if (!cellToWordsMap.has(cell)) {
        cellToWordsMap.set(cell, []);
      }
      cellToWordsMap.get(cell)!.push(wordId);
    }
  }

  // Handler de clique na célula
  const handleCellClick = (cellKey: string) => {
    const wordsAtCell = cellToWordsMap.get(cellKey);
    if (!wordsAtCell || wordsAtCell.length === 0) return;

    if (wordsAtCell.length === 1) {
      // Apenas uma palavra - seleciona/deseleciona
      setSelectedWordId(selectedWordId === wordsAtCell[0] ? null : wordsAtCell[0]);
    } else {
      // Múltiplas palavras (interseção) - alterna entre elas
      const currentIndex = wordsAtCell.indexOf(selectedWordId || '');
      const nextIndex = (currentIndex + 1) % wordsAtCell.length;
      setSelectedWordId(wordsAtCell[nextIndex]);
    }
  };

  // Handler de clique na pista
  const handleClueClick = (wordId: string) => {
    setSelectedWordId(selectedWordId === wordId ? null : wordId);
  };

  // Verifica se célula pertence à palavra selecionada
  const isCellHighlighted = (cellKey: string) => {
    if (!selectedWordId) return false;
    return wordCellsMap.get(selectedWordId)?.has(cellKey) || false;
  };

  return (
    <div className="bg-white p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-medium text-neutral-900">{metadata.title}</h2>
        <p className="text-sm text-neutral-500 mt-1">{metadata.description}</p>
      </div>

      {/* Grade */}
      <div className="flex justify-center mb-8">
        <div
          className="grid gap-0 border-2 border-neutral-800"
          style={{
            gridTemplateColumns: `repeat(${grid.width}, ${cellSize}px)`,
          }}
        >
          {Array.from({ length: grid.height }, (_, y) =>
            Array.from({ length: grid.width }, (_, x) => {
              const key = `${x + 1},${y + 1}`;
              const cell = cellMap.get(key);
              const number = numberMap.get(key);
              const isBlock = cell?.type === 'block';
              const isHighlighted = isCellHighlighted(key);
              const hasWord = cellToWordsMap.has(key);

              return (
                <div
                  key={key}
                  onClick={() => !isBlock && handleCellClick(key)}
                  className={`relative border border-neutral-300 transition-colors ${
                    isBlock
                      ? 'bg-neutral-800'
                      : isHighlighted
                      ? 'bg-[#E8B4B4]/40'
                      : 'bg-white'
                  } ${!isBlock && hasWord ? 'cursor-pointer hover:bg-[#E8B4B4]/20' : ''}`}
                  style={{ width: cellSize, height: cellSize }}
                >
                  {number && (
                    <span
                      className="absolute text-neutral-600 font-medium"
                      style={{
                        fontSize: cellSize * 0.25,
                        top: 1,
                        left: 2,
                      }}
                    >
                      {number}
                    </span>
                  )}
                  {!isBlock && showAnswers && cell?.solution && (
                    <span
                      className="absolute inset-0 flex items-center justify-center font-bold text-neutral-800"
                      style={{ fontSize: cellSize * 0.5 }}
                    >
                      {cell.solution}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pistas */}
      <div className="grid md:grid-cols-2 gap-8">
        {clues.map((group) => (
          <div key={group.title}>
            <h3 className="text-xs text-neutral-400 uppercase tracking-widest mb-3">{group.title}</h3>
            <div className="space-y-1 text-sm">
              {group.clue.map((c) => {
                const isSelected = selectedWordId === c.word;
                return (
                  <div
                    key={c.word}
                    onClick={() => handleClueClick(c.word)}
                    className={`relative flex gap-3 py-1.5 px-2 -mx-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#E8B4B4]/20'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    {/* Indicador lateral estilo Header */}
                    <span
                      className={`absolute left-0 top-0 bottom-0 w-0.5 bg-[#E8A0A0] transition-transform origin-top ${
                        isSelected ? 'scale-y-100' : 'scale-y-0'
                      }`}
                    />
                    <span className={`font-medium min-w-[28px] ${isSelected ? 'text-neutral-900' : 'text-neutral-500'}`}>
                      {c.number}
                    </span>
                    <span className={`flex-1 ${isSelected ? 'text-neutral-900' : 'text-neutral-700'}`}>
                      {c.value}
                    </span>
                    {showAnswers && (
                      <span className="text-neutral-400">({c.format})</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Instrução */}
      <p className="text-xs text-neutral-400 text-center mt-6">
        Clique em uma célula ou pista para destacar a palavra
      </p>
    </div>
  );
}
