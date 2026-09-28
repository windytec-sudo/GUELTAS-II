import React from 'react';
import { Wind, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ subtitle, onBack, showBack = false }) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 shadow-md">
      <div className="max-w-xl mx-auto px-4 py-3 sm:py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && onBack && (
            <button
              onClick={onBack}
              id="header-back-button"
              className="p-1.5 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Volver atrás"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-slate-950 font-bold shadow-sm">
              <Wind className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="text-white font-extrabold tracking-wide text-sm sm:text-base leading-tight">
                S. E. WINDYTEC S. L.
              </div>
              {subtitle && (
                <div className="text-sky-300 text-xs font-medium">
                  {subtitle}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sky-300 font-extrabold text-xs sm:text-xs tracking-wider uppercase">
            P. E. DARCEY
          </div>
          <div className="text-slate-300 font-semibold text-[10px] sm:text-[11px] leading-tight">
            8 x V126 3,45 MW HH137 MK3B
          </div>
        </div>
      </div>
    </header>
  );
};
