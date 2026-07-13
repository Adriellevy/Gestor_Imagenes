import React from 'react';
import { Lock, RefreshCw } from 'lucide-react';

export const AppLockModal: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-6 select-none">
      <div className="absolute w-[450px] h-[450px] bg-rose-600/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative max-w-md w-full bg-slate-900/90 border border-rose-500/30 rounded-3xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-6 text-rose-400">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight mb-3">
          Aplicación Bloqueada
        </h2>

        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          El acceso a <strong className="text-rose-400 font-semibold">Gestor de Imágenes</strong> ha sido desactivado temporalmente desde el centro de administración de <strong className="text-white">Suma Care App Manager</strong>.
        </p>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 text-rose-400 animate-spin" />
          <span>Esperando habilitación remota en tiempo real...</span>
        </div>
      </div>
    </div>
  );
};
