import { useState } from 'react';
import { ShieldCheck, Check, Users, UserCircle, Lock, RotateCcw } from 'lucide-react';
import { ROLES, PERMISOS } from '../../utils/constants';
import { typeMeta } from '../../utils/helpers';
import type { Usuario } from '../../types';

const FONT_MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace";

interface UsersPanelProps {
  usuarios: Usuario[];
  currentUser: Usuario;
  onReset: () => void;
}

export function UsersPanel({ usuarios, currentUser, onReset }: UsersPanelProps) {
  const [confirmar, setConfirmar] = useState(false);
  const roles = Object.entries(ROLES);
  const permisos = Object.entries(PERMISOS);

  return (
    <div className="space-y-6">
      {/* Matriz de permisos por rol */}
      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
            <ShieldCheck size={15} />
          </span>
          <h3 className="text-sm font-semibold text-slate-700">Roles y permisos</h3>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-3 py-2.5 font-medium text-slate-500">Permiso</th>
                {roles.map(([k, r]) => (
                  <th key={k} className="px-3 py-2.5 text-center font-medium" style={{ color: r.color }}>{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permisos.map(([pk, plabel]) => (
                <tr key={pk} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 text-slate-700">{plabel}</td>
                  {roles.map(([rk, r]) => (
                    <td key={rk} className="px-3 py-2 text-center">
                      {r.permisos.includes(pk)
                        ? <Check size={16} className="mx-auto text-emerald-600" />
                        : <span className="mx-auto block h-1 w-3 rounded-full bg-slate-200" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">Vista de solo lectura. La edición de roles y la asignación de permisos se incorporan en el siguiente paso.</p>
      </section>

      {/* Usuarios */}
      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
            <Users size={15} />
          </span>
          <h3 className="text-sm font-semibold text-slate-700">Usuarios</h3>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600" style={{ fontFamily: FONT_MONO }}>{usuarios.length}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {usuarios.map((u: Usuario) => {
            const r = (ROLES as any)[u.rol];
            const alcance = u.servicio
              ? u.servicio
              : u.rol === "tecnico"
                ? (u.sectores && u.sectores.length ? u.sectores.map((id: string) => typeMeta(id)?.short).join(", ") : "Todos los sectores")
                : "—";
            return (
              <div key={u.id} className={`rounded-xl border bg-white p-3 ${u.id === currentUser.id ? "border-slate-400 ring-1 ring-slate-300" : "border-slate-200"}`}>
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: r.color + "1a", color: r.color }}>
                    <UserCircle size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{u.nombre}{u.id === currentUser.id && <span className="ml-1 text-xs font-normal text-slate-400">(vos)</span>}</p>
                    <p className="text-xs font-medium" style={{ color: r.color }}>{r.label}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  <Lock size={11} className="text-slate-400" /> Alcance: <span className="font-medium text-slate-600">{alcance}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
            <RotateCcw size={15} />
          </span>
          <h3 className="text-sm font-semibold text-slate-700">Datos</h3>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm text-slate-500">Los datos persisten entre recargas (si la API lo soporta). Esta acción limpia localStorage si usaba mocks localmente.</p>
          {!confirmar ? (
            <button onClick={() => setConfirmar(true)} className="ml-auto shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">Reiniciar datos</button>
          ) : (
            <span className="ml-auto flex shrink-0 items-center gap-2">
              <button onClick={() => { onReset(); setConfirmar(false); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700">Confirmar</button>
              <button onClick={() => setConfirmar(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">Cancelar</button>
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
