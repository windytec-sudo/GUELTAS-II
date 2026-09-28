import React, { useState } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallPrompt: React.FC = () => {
  const { canInstall, isInstalled, isIOS, installPWA } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // If already running standalone or dismissed, do not show
  if (isInstalled || dismissed) return null;

  // If browser supports beforeinstallprompt (Android Chrome / Desktop Chrome)
  if (canInstall) {
    return (
      <div className="bg-sky-950/90 border border-sky-600/40 rounded-xl p-3.5 shadow-lg flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500 text-slate-950 flex items-center justify-center shrink-0 shadow">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-sky-100 leading-tight">
              Instalar App WINDYTEC
            </div>
            <div className="text-xs text-sky-300">
              Usa la app a pantalla completa sin barras ni menús.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={installPWA}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-slate-400 hover:text-white rounded-md"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari guidance banner
  if (isIOS) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3.5 shadow-lg text-white space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
            <Smartphone className="w-4 h-4" />
            <span>INSTALAR EN IPHONE</span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-300">
          Para verla a pantalla completa sin barras: pulsa el botón <strong>Compartir</strong> (cuadrado con flecha ↑) y luego <strong>"Añadir a la pantalla de inicio"</strong>.
        </p>
      </div>
    );
  }

  return null;
};
