import { Hospital, Activity, Stethoscope, Users, BarChart3, Monitor, UserCircle, ChevronDown } from 'lucide-react';
import { SECTORES, ROLES } from '../../utils/constants';
import type { Usuario } from '../../types';

interface HeaderProps {
  role: string;
  setRole: (role: string) => void;
  currentUser: Usuario;
  onLogout: () => void;
  service: string;
  setService: (s: string) => void;
  hasPermission: (perm: string) => boolean;
  setPantalla: (val: boolean) => void;
}

export function Header({
  role, setRole, currentUser, onLogout, service, setService, hasPermission, setPantalla
}: HeaderProps) {
  
  const seg = (active: boolean) => `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-white">
            <Hospital size={18} />
          </span>
          <div className="leading-tight">
            <div className="font-semibold">Imágenes</div>
            <div className="text-xs text-slate-500">Circuito de estudios · Internación</div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-slate-200/70 p-1">
            {hasPermission("ver_imagenes") && <button className={seg(role === "imaging")} onClick={() => setRole("imaging")}><Activity size={15} /> Imágenes</button>}
            {hasPermission("ver_servicio") && <button className={seg(role === "clinical")} onClick={() => setRole("clinical")}><Stethoscope size={15} /> Área de internación</button>}
            {hasPermission("gestionar_usuarios") && <button className={seg(role === "users")} onClick={() => setRole("users")}><Users size={15} /> Usuarios</button>}
            {currentUser.rol === "admin" && <button className={seg(role === "dashboard")} onClick={() => setRole("dashboard")}><BarChart3 size={15} /> Dashboard</button>}
          </div>
          
          {hasPermission("ver_imagenes") && (
            <button onClick={() => setPantalla(true)} title="Modo pantalla (tablero)" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100">
              <Monitor size={15} /> Pantalla
            </button>
          )}

          {role === "clinical" && (
            currentUser.rol === "medico" ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm font-medium text-slate-600">
                <Stethoscope size={14} className="text-slate-400" /> {service}
              </span>
            ) : (
              <div className="relative">
                <select value={service} onChange={(e) => setService(e.target.value)} className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-blue-400">
                  {SECTORES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            )
          )}
          
          <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
            <div className="flex items-center gap-2">
              <UserCircle size={16} style={{ color: (ROLES as any)[currentUser.rol]?.color }} />
              <span className="text-sm font-medium text-slate-700">{currentUser.nombre}</span>
            </div>
            <button 
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:border-red-200"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
