import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { User, LogIn, Activity } from 'lucide-react';

const FONT_SANS = "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif";

export function LoginScreen() {
  const { usuarios, login } = useStore();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    
    setLoading(true);
    await login(selectedUserId);
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: FONT_SANS }} className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-10 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <Activity size={32} />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
            Gestoy
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Módulo de Gestión de Imágenes
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="user" className="block text-sm font-medium text-slate-700">
                Seleccioná tu perfil para ingresar
              </label>
              <div className="mt-2 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <select
                  id="user"
                  className="block w-full rounded-xl border-slate-300 py-3 pl-10 text-slate-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-slate-50"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={loading}
                >
                  <option value="" disabled>Seleccionar usuario...</option>
                  {usuarios.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} ({u.rol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={!selectedUserId || loading}
              className="group relative flex w-full justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <LogIn className="h-5 w-5 text-blue-500 group-hover:text-blue-400 transition-colors" aria-hidden="true" />
              </span>
              {loading ? 'Ingresando...' : 'Entrar al sistema'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
