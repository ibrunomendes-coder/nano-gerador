import { NextRequest, NextResponse } from 'next/server';
import { generateWordsForPuzzle, SourceType } from '@/lib/gemini';
import { GameType, Difficulty } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameType, difficulty, theme, sourceType, documentText } = body as {
      gameType: GameType;
      difficulty: Difficulty;
      theme: string;
      sourceType?: SourceType;
      documentText?: string | null;
    };

    if (!gameType || !difficulty) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    // Validar baseado no sourceType
    const source = sourceType || 'gemini';

    if (source === 'gemini' && !theme) {
      return NextResponse.json(
        { error: 'Tema é obrigatório para geração com Gemini' },
        { status: 400 }
      );
    }

    if (source === 'document' && !documentText) {
      return NextResponse.json(
        { error: 'Documento é obrigatório para extração' },
        { status: 400 }
      );
    }

    if (source === 'both' && (!theme || !documentText)) {
      return NextResponse.json(
        { error: 'Tema e documento são obrigatórios para modo combinado' },
        { status: 400 }
      );
    }

    const result = await generateWordsForPuzzle(
      gameType,
      difficulty,
      theme || '',
      source,
      documentText
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro na geração:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar palavras' },
      { status: 500 }
    );
  }
}
