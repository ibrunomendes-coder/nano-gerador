'use client';

import { GeneratedWord, GameType } from '@/types';

interface WordListProps {
  words: GeneratedWord[];
  setWords: (words: GeneratedWord[]) => void;
  gameType: GameType;
  onRegenerate: (index: number) => void;
  isRegenerating: number | null;
}

export default function WordList({
  words,
  setWords,
  gameType,
  onRegenerate,
  isRegenerating,
}: WordListProps) {
  const toggleWord = (index: number) => {
    const newWords = [...words];
    newWords[index] = { ...newWords[index], selected: !newWords[index].selected };
    setWords(newWords);
  };

  const updateWord = (index: number, field: 'word' | 'clue', value: string) => {
    const newWords = [...words];
    newWords[index] = { ...newWords[index], [field]: value.toUpperCase() };
    setWords(newWords);
  };

  const removeWord = (index: number) => {
    const newWords = words.filter((_, i) => i !== index);
    setWords(newWords);
  };

  const addWord = () => {
    setWords([...words, { word: '', clue: '', selected: true }]);
  };

  const selectedCount = words.filter((w) => w.selected).length;

  return (
    <div className="bg-white p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-neutral-900">Palavras Geradas</h2>
        <span className="text-sm text-neutral-500">
          {selectedCount} de {words.length} selecionadas
        </span>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {words.map((word, index) => (
          <div
            key={index}
            className={`p-4 border transition-all ${
              word.selected
                ? 'border-[#7B9E89] bg-[#7B9E89]/5'
                : 'border-neutral-200 bg-neutral-50 opacity-60'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Checkbox */}
              <button
                onClick={() => toggleWord(index)}
                className={`mt-1 w-5 h-5 border-2 flex items-center justify-center transition-colors ${
                  word.selected
                    ? 'bg-[#7B9E89] border-[#7B9E89] text-white'
                    : 'border-neutral-300'
                }`}
              >
                {word.selected && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>

              {/* Campos */}
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={word.word}
                  onChange={(e) => updateWord(index, 'word', e.target.value)}
                  placeholder="PALAVRA"
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#7B9E89] focus:border-transparent"
                />
                {gameType === 'crossword' && (
                  <input
                    type="text"
                    value={word.clue}
                    onChange={(e) => updateWord(index, 'clue', e.target.value)}
                    placeholder="Pista/definicao..."
                    className="w-full px-3 py-2 text-sm border border-neutral-200 text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#7B9E89] focus:border-transparent"
                  />
                )}
              </div>

              {/* Acoes */}
              <div className="flex gap-1">
                <button
                  onClick={() => onRegenerate(index)}
                  disabled={isRegenerating === index}
                  className="p-2 text-neutral-400 hover:text-[#7B9E89] transition-colors disabled:opacity-50"
                  title="Regenerar palavra"
                >
                  {isRegenerating === index ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
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
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => removeWord(index)}
                  className="p-2 text-neutral-400 hover:text-[#E8B4B4] transition-colors"
                  title="Remover palavra"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Adicionar Palavra */}
      <button
        onClick={addWord}
        className="mt-4 w-full py-3 px-4 border-2 border-dashed border-neutral-300 text-neutral-500 hover:border-neutral-400 hover:text-neutral-600 font-medium transition-colors"
      >
        + Adicionar Palavra
      </button>
    </div>
  );
}
