'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

interface HeaderProps {
  onReset?: () => void;
  showReset?: boolean;
}

export default function Header({ onReset, showReset }: HeaderProps) {
  const { data: session, status } = useSession();

  return (
    <header className="bg-white border-b border-neutral-100">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-4">
            <Image
              src="/Gemilogo-nano.png"
              alt="nano passatempos"
              width={500}
              height={150}
              className="h-16 sm:h-20 md:h-24 w-auto"
              priority
            />
            <div className="hidden sm:block border-l border-neutral-200 pl-4">
              <span className="text-sm font-medium text-neutral-600">gerador</span>
            </div>
          </Link>

          {/* Right Content */}
          <div className="flex items-center gap-4">
            {/* Link para jogos salvos */}
            <Link
              href="/jogos"
              className="px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
            >
              Jogos Salvos
            </Link>

            {showReset && onReset && (
              <button
                onClick={onReset}
                className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
              >
                Novo passatempo
              </button>
            )}

            {/* User menu */}
            {status === 'loading' ? (
              <div className="w-8 h-8 bg-neutral-100 animate-pulse" />
            ) : session?.user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-neutral-900">{session.user.name}</p>
                  <p className="text-xs text-neutral-500">{session.user.email}</p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  title="Sair"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 text-sm bg-[#7B9E89] text-white font-medium hover:bg-[#6B8E79] transition-colors"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
