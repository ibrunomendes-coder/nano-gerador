'use client';

import { SoletraPuzzle, DIFFICULTY_LABELS } from '@/types';

interface SoletraPreviewProps {
  puzzle: SoletraPuzzle;
  showAnswers: boolean;
}

export default function SoletraPreview({ puzzle, showAnswers }: SoletraPreviewProps) {
  const { letters, centerLetter, validWords, pangrams, maxScore, rankings, difficulty } = puzzle;

  // Cor do Soletra (verde-água pastel)
  const soletraColor = '#C5E0DC';
  const soletraColorDark = '#8BBDB5';

  // Posições para os hexágonos (1 central + 6 ao redor)
  // Layout honeycomb: centro em (0,0), outros em posições circulares
  const hexPositions = [
    { x: 0, y: 0 },      // Centro
    { x: 0, y: -60 },    // Topo
    { x: 52, y: -30 },   // Topo-direita
    { x: 52, y: 30 },    // Baixo-direita
    { x: 0, y: 60 },     // Baixo
    { x: -52, y: 30 },   // Baixo-esquerda
    { x: -52, y: -30 },  // Topo-esquerda
  ];

  // Separa a letra central das outras
  const otherLetters = letters.filter(l => l !== centerLetter);

  // Calcula porcentagem do ranking
  const getProgressPercent = (threshold: number) => {
    return Math.min(100, Math.round((threshold / maxScore) * 100));
  };

  return (
    <div className="bg-white p-6">
      {/* Header do puzzle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-neutral-900">{puzzle.name}</h2>
          <p className="text-sm text-neutral-500">
            {DIFFICULTY_LABELS[difficulty]} · {validWords.length} palavras
          </p>
        </div>
        {showAnswers && (
          <span className="px-3 py-1 bg-[#C5E0DC]/30 text-[#5A9A8D] text-sm font-medium rounded">
            Solução
          </span>
        )}
      </div>

      {/* Hexágonos das letras */}
      <div className="flex justify-center mb-8">
        <div className="relative" style={{ width: 180, height: 180 }}>
          <svg
            viewBox="-90 -90 180 180"
            className="w-full h-full"
          >
            {hexPositions.map((pos, index) => {
              const isCenter = index === 0;
              const letter = isCenter ? centerLetter : otherLetters[index - 1];

              return (
                <g key={index} transform={`translate(${pos.x}, ${pos.y})`}>
                  {/* Hexágono */}
                  <polygon
                    points="0,-28 24,-14 24,14 0,28 -24,14 -24,-14"
                    fill={isCenter ? soletraColorDark : soletraColor}
                    stroke="#fff"
                    strokeWidth="2"
                    className="transition-colors"
                  />
                  {/* Letra */}
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={`text-xl font-bold ${isCenter ? 'fill-white' : 'fill-neutral-800'}`}
                    style={{ fontSize: '18px' }}
                  >
                    {letter}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Informações de pontuação */}
      <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-neutral-700">Pontuação máxima</span>
          <span className="text-lg font-bold text-neutral-900">{maxScore} pts</span>
        </div>

        {/* Barra de rankings */}
        <div className="relative h-3 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: '100%',
              background: `linear-gradient(to right,
                #E5E5E5 0%,
                #E5E5E5 ${getProgressPercent(rankings.beginner)}%,
                ${soletraColor} ${getProgressPercent(rankings.beginner)}%,
                ${soletraColor} ${getProgressPercent(rankings.good)}%,
                #8BBDB5 ${getProgressPercent(rankings.good)}%,
                #8BBDB5 ${getProgressPercent(rankings.great)}%,
                #5A9A8D ${getProgressPercent(rankings.great)}%,
                #5A9A8D ${getProgressPercent(rankings.amazing)}%,
                #3D7A6E ${getProgressPercent(rankings.amazing)}%,
                #3D7A6E ${getProgressPercent(rankings.genius)}%,
                #FFD700 ${getProgressPercent(rankings.genius)}%
              )`,
            }}
          />
        </div>

        {/* Labels dos rankings */}
        <div className="mt-2 flex justify-between text-xs text-neutral-500">
          <span>Iniciante</span>
          <span>Bom</span>
          <span>Ótimo</span>
          <span>Incrível</span>
          <span>Gênio</span>
        </div>
      </div>

      {/* Pangrams */}
      {pangrams.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-600 text-lg">✨</span>
            <span className="text-sm font-medium text-amber-800">
              {pangrams.length} Pangrama{pangrams.length > 1 ? 's' : ''}
            </span>
          </div>
          {showAnswers ? (
            <div className="flex flex-wrap gap-2">
              {pangrams.map((word, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded"
                >
                  {word}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-700">
              Palavra(s) que usa(m) todas as 7 letras
            </p>
          )}
        </div>
      )}

      {/* Lista de palavras (quando mostrando respostas) */}
      {showAnswers && (
        <div className="border-t border-neutral-100 pt-4">
          <h3 className="text-sm font-medium text-neutral-700 mb-3">
            Todas as palavras ({validWords.length})
          </h3>
          <div className="max-h-48 overflow-y-auto">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 text-sm">
              {validWords.map((word, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-1 rounded ${
                    pangrams.includes(word)
                      ? 'bg-amber-100 text-amber-800 font-medium'
                      : 'text-neutral-700'
                  }`}
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-neutral-100">
        <div className="flex items-center justify-center gap-8 text-sm">
          <div className="text-center">
            <span className="block text-2xl font-medium text-neutral-900">{validWords.length}</span>
            <span className="text-neutral-500">Palavras</span>
          </div>
          <div className="text-center">
            <span className="block text-2xl font-medium text-neutral-900">{pangrams.length}</span>
            <span className="text-neutral-500">Pangramas</span>
          </div>
          <div className="text-center">
            <span className="block text-2xl font-medium text-neutral-900">{maxScore}</span>
            <span className="text-neutral-500">Pts máx</span>
          </div>
        </div>
      </div>

      {/* Regras do jogo */}
      <div className="mt-6 p-4 bg-neutral-50 rounded-lg text-sm text-neutral-600">
        <h4 className="font-medium text-neutral-800 mb-2">Regras:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Palavras devem ter 4+ letras</li>
          <li>A letra central ({centerLetter}) deve estar em todas as palavras</li>
          <li>Letras podem ser repetidas</li>
          <li>Pangrama usa todas as 7 letras (+7 pontos bônus)</li>
        </ul>
      </div>
    </div>
  );
}
