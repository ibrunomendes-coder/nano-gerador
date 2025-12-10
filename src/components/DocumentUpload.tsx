'use client';

import { useState, useRef } from 'react';

interface DocumentUploadProps {
  onDocumentProcessed: (text: string, fileName: string) => void;
  onRemove: () => void;
  fileName: string | null;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function DocumentUpload({
  onDocumentProcessed,
  onRemove,
  fileName,
  isProcessing,
  setIsProcessing,
}: DocumentUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);

    // Validar tipo
    if (!Object.keys(ACCEPTED_TYPES).includes(file.type) && !file.name.endsWith('.txt')) {
      setError('Formato não suportado. Use PDF, TXT ou DOCX.');
      return;
    }

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      setError('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar documento');
      }

      onDocumentProcessed(data.text, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar documento');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  if (fileName) {
    return (
      <div className="border border-[#7B9E89] bg-[#7B9E89]/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-[#7B9E89]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-neutral-900">{fileName}</p>
              <p className="text-xs text-neutral-500">Documento carregado</p>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="p-2 text-neutral-400 hover:text-[#E8B4B4] transition-colors"
            title="Remover documento"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className={`border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-[#7B9E89] bg-[#7B9E89]/5'
            : 'border-neutral-300 hover:border-neutral-400'
        } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.doc,.docx"
          onChange={handleChange}
          className="hidden"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <svg className="w-8 h-8 text-neutral-400 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm text-neutral-500">Processando documento...</p>
          </div>
        ) : (
          <>
            <svg className="w-8 h-8 mx-auto text-neutral-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-neutral-700 mb-1">
              Arraste um arquivo ou <span className="text-[#7B9E89] font-medium">clique para selecionar</span>
            </p>
            <p className="text-xs text-neutral-500">PDF, TXT ou DOCX (máx. 10MB)</p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-[#E8B4B4]">{error}</p>
      )}
    </div>
  );
}
