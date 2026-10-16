import React, { useState } from 'react';
import { Monitor } from 'lucide-react';
import { DesktopAppModal } from './DesktopAppModal';

interface DesktopAppButtonProps {
  variant?: 'compact' | 'full' | 'login' | 'header';
  className?: string;
}

export const DesktopAppButton: React.FC<DesktopAppButtonProps> = ({ variant = 'full', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (variant === 'login') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`w-full py-3 px-4 bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 border border-indigo-500/30 hover:border-indigo-400 text-indigo-300 hover:text-white rounded-2xl flex items-center justify-center gap-2.5 transition-all text-xs font-bold shadow-lg shadow-indigo-950/20 group ${className}`}
        >
          <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
            <Monitor className="w-4 h-4" />
          </div>
          <span>Trabalhar como Aplicativo Desktop (Sem Barra da Internet)</span>
        </button>
        <DesktopAppModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </>
    );
  }

  if (variant === 'header') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`h-9 px-3 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/50 hover:border-indigo-500 text-indigo-200 hover:text-white rounded-xl flex items-center gap-2 transition text-xs font-black uppercase tracking-wider shadow-sm group ${className}`}
          title="Instalar ou executar em janela dedicada de aplicativo sem barra de navegador"
        >
          <Monitor className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Modo App Desktop</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </button>
        <DesktopAppModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`p-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 rounded-xl transition ${className}`}
          title="Opções de Aplicativo Desktop"
        >
          <Monitor className="w-4 h-4" />
        </button>
        <DesktopAppModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`py-2 px-3.5 bg-gradient-to-r from-indigo-900/80 to-slate-900/80 hover:from-indigo-800 hover:to-slate-800 border border-indigo-600/40 hover:border-indigo-400 text-indigo-200 hover:text-white rounded-xl flex items-center gap-2 text-xs font-bold transition shadow-sm ${className}`}
      >
        <Monitor className="w-4 h-4 text-indigo-400" />
        <span>Usar como App Desktop</span>
      </button>
      <DesktopAppModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
