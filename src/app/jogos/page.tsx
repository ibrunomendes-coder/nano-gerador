'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { SavedGame, GameStatus } from '@/lib/games';
import { GAME_TYPE_LABELS, DIFFICULTY_LABELS } from '@/types';

export default function JogosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [games, setGames] = useState<SavedGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | GameStatus>('all');

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchGames();
    }
  }, [filter, status]);

  const fetchGames = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const res = await fetch(`/api/games?${params.toString()}`);
      const data = await res.json();
      setGames(data.games || []);
    } catch (error) {
      console.error('Erro ao carregar jogos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este jogo?')) return;

    try {
      const res = await fetch(`/api/games/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setGames(games.filter(g => g.id !== id));
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const handleContinue = (game: SavedGame) => {
    // Salva o jogo no localStorage para carregar na página principal
    localStorage.setItem('continue-game', JSON.stringify(game));
    router.push('/');
  };

  const getStatusBadge = (status: GameStatus) => {
    const styles = {
      draft: 'bg-[#D4A843]/20 text-[#D4A843] border-[#D4A843]',
      complete: 'bg-[#7B9E89]/20 text-[#7B9E89] border-[#7B9E89]',
      published: 'bg-[#E8B4B4]/20 text-[#E8B4B4] border-[#E8B4B4]',
    };
    const labels = {
      draft: 'Rascunho',
      complete: 'Completo',
      published: 'Publicado',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
    <div className="min-h-screen bg-[#E5E5E5]">
      <Header />

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Jogos Salvos</h1>
            <p className="text-neutral-500 mt-1">
              Base compartilhada de todos os criadores
            </p>
          </div>

          {status === 'authenticated' && (
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-[#7B9E89] text-white font-medium hover:bg-[#6B8E79] transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Novo Jogo
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 mb-6 flex gap-2">
          {(['all', 'draft', 'complete', 'published'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'draft' ? 'Rascunhos' : f === 'complete' ? 'Completos' : 'Publicados'}
            </button>
          ))}
        </div>

        {/* Lista de jogos */}
        {isLoading ? (
          <div className="bg-white p-8 text-center text-neutral-500">
            Carregando jogos...
          </div>
        ) : games.length === 0 ? (
          <div className="bg-white p-8 text-center">
            <p className="text-neutral-500 mb-4">Nenhum jogo encontrado</p>
            {status === 'authenticated' && (
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-[#7B9E89] text-white font-medium hover:bg-[#6B8E79]"
              >
                Criar primeiro jogo
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {games.map((game) => (
              <div key={game.id} className="bg-white p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium ${
                        game.gameType === 'crossword'
                          ? 'bg-[#E8B4B4]/30 text-[#E8B4B4]'
                          : 'bg-[#D4A843]/30 text-[#D4A843]'
                      }`}>
                        {GAME_TYPE_LABELS[game.gameType]}
                      </span>
                      {getStatusBadge(game.status)}
                      <span className="text-xs text-neutral-400">
                        {DIFFICULTY_LABELS[game.difficulty]}
                      </span>
                    </div>

                    <h3 className="text-lg font-medium text-neutral-900 mb-1">
                      {game.title || 'Sem título'}
                    </h3>

                    <p className="text-sm text-neutral-500 mb-2">
                      {game.theme || 'Sem tema'}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-neutral-400">
                      <span>{game.words?.length || 0} palavras</span>
                      <span>Por {game.createdByName}</span>
                      <span>{formatDate(game.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {status === 'authenticated' && game.status === 'draft' && (
                      <button
                        onClick={() => handleContinue(game)}
                        className="px-3 py-1.5 text-sm bg-[#7B9E89] text-white hover:bg-[#6B8E79] transition-colors"
                      >
                        Continuar
                      </button>
                    )}

                    {game.status === 'complete' && game.puzzle && (
                      <button
                        onClick={() => {
                          const jsonData = JSON.stringify(
                            game.gameType === 'crossword' ? [game.puzzle] : game.puzzle,
                            null,
                            2
                          );
                          const blob = new Blob([jsonData], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${game.title || 'jogo'}.json`;
                          a.click();
                        }}
                        className="px-3 py-1.5 text-sm border border-neutral-300 text-neutral-600 hover:bg-neutral-50 transition-colors"
                      >
                        Baixar JSON
                      </button>
                    )}

                    {status === 'authenticated' && (
                      <button
                        onClick={() => handleDelete(game.id)}
                        className="px-3 py-1.5 text-sm text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
