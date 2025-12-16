import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGameById, deleteGame, updateGameStatus } from '@/lib/games';

// GET - Busca jogo por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const game = getGameById(id);

    if (!game) {
      return NextResponse.json(
        { error: 'Jogo não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Erro ao buscar jogo:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar jogo' },
      { status: 500 }
    );
  }
}

// PATCH - Atualiza status do jogo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Você precisa estar logado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { isTested, isPublished, status } = body;

    const game = updateGameStatus(id, { isTested, isPublished, status });

    if (!game) {
      return NextResponse.json(
        { error: 'Jogo não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Erro ao atualizar jogo:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar jogo' },
      { status: 500 }
    );
  }
}

// DELETE - Deleta jogo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Você precisa estar logado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const deleted = deleteGame(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Jogo não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar jogo:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar jogo' },
      { status: 500 }
    );
  }
}
