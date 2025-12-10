import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    let text = '';

    // Processar baseado no tipo de arquivo
    if (fileName.endsWith('.txt')) {
      // Arquivo de texto simples
      text = await file.text();
    } else if (fileName.endsWith('.pdf')) {
      // PDF - usar pdf-parse
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Importar dinamicamente para evitar problemas de SSR
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
    } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      // Para DOCX, extrair texto básico do XML
      // Nota: Para produção, considere usar mammoth ou similar
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Tentar extrair texto do DOCX (que é um ZIP com XMLs)
      try {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(buffer);
        const documentXml = await zip.file('word/document.xml')?.async('string');

        if (documentXml) {
          // Extrair texto removendo tags XML
          text = documentXml
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        } else {
          throw new Error('Não foi possível ler o documento');
        }
      } catch {
        return NextResponse.json(
          { error: 'Erro ao processar DOCX. Tente converter para PDF ou TXT.' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Formato não suportado. Use PDF, TXT ou DOCX.' },
        { status: 400 }
      );
    }

    // Limpar e normalizar o texto
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!text || text.length < 10) {
      return NextResponse.json(
        { error: 'Documento vazio ou com pouco conteúdo' },
        { status: 400 }
      );
    }

    // Limitar tamanho do texto (para não sobrecarregar a API do Gemini)
    const MAX_CHARS = 50000;
    if (text.length > MAX_CHARS) {
      text = text.substring(0, MAX_CHARS) + '...';
    }

    return NextResponse.json({
      text,
      charCount: text.length,
      fileName: file.name,
    });
  } catch (error) {
    console.error('Erro ao processar documento:', error);
    return NextResponse.json(
      { error: 'Erro ao processar documento' },
      { status: 500 }
    );
  }
}
