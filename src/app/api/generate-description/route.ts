import { NextRequest, NextResponse } from 'next/server';
import { generateWordsearchDescription } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { theme, words } = body as {
      theme: string;
      words: string[];
    };

    if (!words || words.length === 0) {
      return NextResponse.json(
        { error: 'Lista de palavras é obrigatória' },
        { status: 400 }
      );
    }

    const description = await generateWordsearchDescription(
      theme || 'o tema',
      words
    );

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Erro ao gerar descrição:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar descrição' },
      { status: 500 }
    );
  }
}
