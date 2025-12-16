import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listGames, saveGame, GameStatus } from '@/lib/games';
import { GameType, Difficulty, GeneratedWord, CrosswordPuzzle, WordSearchPuzzle } from '@/types';

// GET - Lista todos os jogos (compartilhado)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as GameStatus | null;
    const gameType = searchParams.get('gameType') as GameType | null;

    const games = listGames({
      status: status || undefined,
      gameType: gameType || undefined,
    });

    return NextResponse.json({ games });
  } catch (error) {
    console.error('Erro ao listar jogos:', error);
    return NextResponse.json(
      { error: 'Erro ao listar jogos' },
      { status: 500 }
    );
  }
}

// POST - Salva um jogo (requer autenticação)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Você precisa estar logado para salvar jogos' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      id,
      title,
      theme,
      gameType,
      difficulty,
      status,
      words,
      description,
      puzzle,
      isTested,
      isPublished,
    } = body as {
      id?: string;
      title: string;
      theme: string;
      gameType: GameType;
      difficulty: Difficulty;
      status: GameStatus;
      words: GeneratedWord[];
      description: string;
      puzzle: CrosswordPuzzle | WordSearchPuzzle | null;
      isTested?: boolean;
      isPublished?: boolean;
    };

    if (!title || !gameType || !difficulty) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    const game = saveGame({
      id,
      title,
      theme,
      gameType,
      difficulty,
      status,
      words,
      description,
      puzzle,
      createdBy: session.user.email || 'unknown',
      createdByName: session.user.name || 'Anônimo',
      isTested: isTested || false,
      isPublished: isPublished || false,
    });

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Erro ao salvar jogo:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar jogo' },
      { status: 500 }
    );
  }
}
