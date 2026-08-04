import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { User, Lock, LogIn } from 'lucide-react';

const FONT_SANS = "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif";

export function LoginScreen() {
  const { login } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setError('');
    try {
      await login(username, password);
    } catch {
      setError('Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: FONT_SANS }} className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-10 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex justify-center mb-2">
            <img src="/Logo Suma_Care.png" alt="Suma Care Logo" className="h-16 object-contain" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">Suma Care</h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Módulo de Gestión de Imágenes · Internación y Guardia
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleLogin}>
          <div className="relative rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <User className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder="Usuario"
              className="block w-full rounded-xl border-slate-300 py-3 pl-10 text-slate-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-slate-50"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="relative rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>
            <input
              type="password"
              placeholder="Contraseña"
              className="block w-full rounded-xl border-slate-300 py-3 pl-10 text-slate-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-slate-50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!username || !password || loading}
            className="group relative flex w-full justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <LogIn className="h-5 w-5 text-blue-500 group-hover:text-blue-400 transition-colors" aria-hidden="true" />
            </span>
            {loading ? 'Ingresando...' : 'Entrar al sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
