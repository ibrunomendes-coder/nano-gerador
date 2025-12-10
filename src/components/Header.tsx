'use client';

import Image from 'next/image';

interface HeaderProps {
  onReset?: () => void;
  showReset?: boolean;
}

export default function Header({ onReset, showReset }: HeaderProps) {
  return (
    <header className="bg-white border-b border-neutral-100">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
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
          </div>

          {/* Right Content */}
          <div className="flex items-center gap-3">
            {showReset && onReset && (
              <button
                onClick={onReset}
                className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
              >
                Novo passatempo
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
