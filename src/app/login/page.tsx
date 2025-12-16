'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        // Validações
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem');
        }

        if (password.length < 6) {
          throw new Error('Senha deve ter pelo menos 6 caracteres');
        }

        // Registra usuário
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Erro ao criar conta');
        }

        // Faz login automático após registro
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          throw new Error('Conta criada! Faça login para continuar.');
        }

        router.push('/');
        router.refresh();
      } else {
        // Login
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          throw new Error('Email ou senha incorretos');
        }

        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#E5E5E5] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/Gemilogo-nano.png"
            alt="nano passatempos"
            width={80}
            height={80}
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-neutral-900">nano passatempos</h1>
          <p className="text-neutral-500 mt-1">Gerador de cruzadas e caça-palavras</p>
        </div>

        {/* Card */}
        <div className="bg-white p-8">
          <h2 className="text-xl font-medium text-neutral-900 mb-6">
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-[#E8B4B4]/20 border border-[#E8B4B4] text-neutral-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#7B9E89]"
                  placeholder="Seu nome"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#7B9E89]"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#7B9E89]"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Confirmar senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#7B9E89]"
                  placeholder="Digite a senha novamente"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 font-medium transition-all ${
                isLoading
                  ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                  : 'bg-[#7B9E89] text-white hover:bg-[#6B8E79]'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === 'login' ? 'Entrando...' : 'Criando conta...'}
                </span>
              ) : (
                mode === 'login' ? 'Entrar' : 'Criar conta'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={toggleMode}
              className="text-sm text-neutral-600 hover:text-[#7B9E89] transition-colors"
            >
              {mode === 'login' ? (
                <>Não tem conta? <span className="font-medium">Criar conta</span></>
              ) : (
                <>Já tem conta? <span className="font-medium">Entrar</span></>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          Seus jogos ficam salvos para continuar depois
        </p>
      </div>
    </div>
  );
}
