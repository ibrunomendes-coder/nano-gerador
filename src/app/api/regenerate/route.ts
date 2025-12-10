import { NextRequest, NextResponse } from 'next/server';
import { regenerateWord, SourceType } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { theme, existingWords, maxLength, needClue, sourceType, documentText } = body as {
      theme: string;
      existingWords: string[];
      maxLength: number;
      needClue: boolean;
      sourceType?: SourceType;
      documentText?: string | null;
    };

    if (!existingWords || !maxLength) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    const newWord = await regenerateWord(
      theme || '',
      existingWords,
      maxLength,
      needClue,
      sourceType || 'gemini',
      documentText
    );

    return NextResponse.json(newWord);
  } catch (error) {
    console.error('Erro na regeneracao:', error);
    return NextResponse.json(
      { error: 'Erro ao regenerar palavra' },
      { status: 500 }
    );
  }
}
