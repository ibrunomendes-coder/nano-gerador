'use client';

import { SudokuPuzzle, DIFFICULTY_LABELS } from '@/types';

interface SudokuPreviewProps {
  puzzle: SudokuPuzzle;
  showAnswers: boolean;
}

export default function SudokuPreview({ puzzle, showAnswers }: SudokuPreviewProps) {
  const { grid, solution, difficulty, clueCount } = puzzle;

  // Determina o índice do quadrante 3x3 para colorização alternada
  const getBoxIndex = (row: number, col: number): number => {
    return Math.floor(row / 3) * 3 + Math.floor(col / 3);
  };

  // Quadrantes alternados (como NYT): 0,2,4,6,8 são de uma cor, 1,3,5,7 de outra
  const isAlternateBox = (row: number, col: number): boolean => {
    const boxIndex = getBoxIndex(row, col);
    return boxIndex % 2 === 0;
  };

  // Verifica se é uma célula de pista (já preenchida)
  const isClue = (row: number, col: number): boolean => {
    return grid[row][col] !== null;
  };

  // Obtém o valor a exibir na célula
  const getCellValue = (row: number, col: number): string => {
    if (showAnswers) {
      return solution[row][col].toString();
    }
    const clue = grid[row][col];
    return clue !== null ? clue.toString() : '';
  };

  // Verifica se a borda é grossa (divisão de quadrante)
  const isThickBorderRight = (col: number): boolean => col === 2 || col === 5;
  const isThickBorderBottom = (row: number): boolean => row === 2 || row === 5;

  return (
    <div className="bg-white p-6">
      {/* Header do puzzle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-neutral-900">{puzzle.name}</h2>
          <p className="text-sm text-neutral-500">
            {DIFFICULTY_LABELS[difficulty]} · {clueCount} pistas
          </p>
        </div>
        {showAnswers && (
          <span className="px-3 py-1 bg-[#7B9E89]/20 text-[#7B9E89] text-sm font-medium rounded">
            Solução
          </span>
        )}
      </div>

      {/* Grade do Sudoku */}
      <div className="flex justify-center">
        <div
          className="inline-grid border-2 border-neutral-900"
          style={{
            gridTemplateColumns: 'repeat(9, 1fr)',
            gap: 0,
          }}
        >
          {grid.map((row, rowIndex) =>
            row.map((_, colIndex) => {
              const value = getCellValue(rowIndex, colIndex);
              const isClueCell = isClue(rowIndex, colIndex);
              const isAltBox = isAlternateBox(rowIndex, colIndex);

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center
                    text-lg sm:text-xl font-medium
                    border-neutral-300
                    ${isAltBox ? 'bg-[#F5F0E6]' : 'bg-white'}
                    ${isClueCell ? 'text-neutral-900' : 'text-[#4A7C59]'}
                    ${colIndex < 8 ? (isThickBorderRight(colIndex) ? 'border-r-2 border-r-neutral-900' : 'border-r') : ''}
                    ${rowIndex < 8 ? (isThickBorderBottom(rowIndex) ? 'border-b-2 border-b-neutral-900' : 'border-b') : ''}
                  `}
                >
                  {value}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Informações do puzzle */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm text-neutral-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#F5F0E6] border border-neutral-300" />
          <span>Quadrante alternado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-neutral-900">9</span>
          <span>Pista</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#4A7C59]">5</span>
          <span>Resposta</span>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-neutral-100">
        <div className="flex items-center justify-center gap-8 text-sm">
          <div className="text-center">
            <span className="block text-2xl font-medium text-neutral-900">{clueCount}</span>
            <span className="text-neutral-500">Pistas</span>
          </div>
          <div className="text-center">
            <span className="block text-2xl font-medium text-neutral-900">{81 - clueCount}</span>
            <span className="text-neutral-500">Para resolver</span>
          </div>
          <div className="text-center">
            <span className="block text-2xl font-medium text-neutral-900">
              {Math.round((clueCount / 81) * 100)}%
            </span>
            <span className="text-neutral-500">Preenchido</span>
          </div>
        </div>
      </div>
    </div>
  );
}
