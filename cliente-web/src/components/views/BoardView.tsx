import { useState, useEffect } from 'react';
import { Hospital, X } from 'lucide-react';
import { typeMeta, waitMins, waitText, fmtHora } from '../../utils/helpers';
import { IMAGE_TYPES, PRIORITIES, STATUS } from '../../utils/constants';
import type { Pedido } from '../../types';

const FONT_SANS = "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace";

interface BoardViewProps {
  studies: Pedido[];
  now: number;
  onExit: () => void;
}

export function BoardView({ studies, now, onExit }: BoardViewProps) {
  const [reloj, setReloj] = useState(Date.now());
  const [filtro, setFiltro] = useState("todos");
  
  useEffect(() => { 
    const t = setInterval(() => setReloj(Date.now()), 1000); 
    return () => clearInterval(t); 
  }, []);

  const ESTADO_BOARD: Record<string, {label: string, cls: string}> = {
    autorizacion_pendiente: { label: "AUTORIZAR",   cls: "text-amber-300" },
    solicitado:             { label: "PENDIENTE",   cls: "text-slate-100" },
    traslado_solicitado:    { label: "EN TRASLADO", cls: "text-cyan-300" },
    en_proceso:             { label: "EN PROCESO",  cls: "text-blue-300" },
  };

  const COLS = "1fr 2fr 1.6fr 2.2fr 0.9fr 1.2fr 0.9fr";
  const activos = studies
    .filter((s) => STATUS[s.estado]?.active && (filtro === "todos" || s.modalidad === filtro))
    .sort((a, b) => (PRIORITIES[a.prioridad]?.rank - PRIORITIES[b.prioridad]?.rank) || (a.fechaSolicitud - b.fechaSolicitud));
    
  const rojos = activos.filter((s) => s.prioridad === "urgente").length;

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-950 text-slate-100" style={{ fontFamily: FONT_SANS, zIndex: 60 }}>
      <div className="flex items-center justify-between border-b border-slate-800 px-8 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-slate-900"><Hospital size={22} /></span>
          <div>
            <div className="text-2xl font-bold tracking-tight">Imágenes — Cola de estudios</div>
            <div className="text-sm text-slate-400">{activos.length} en cola{rojos > 0 ? ` · ${rojos} código rojo` : ""}</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right" style={{ fontFamily: FONT_MONO }}>
            <div className="text-3xl font-bold tabular-nums">{new Date(reloj).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="text-xs text-slate-500">{new Date(reloj).toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short" })}</div>
          </div>
          <button onClick={onExit} title="Salir del modo pantalla" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-700 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"><X size={20} /></button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-8 py-2.5">
        <button onClick={() => setFiltro("todos")} className={`rounded-lg px-3 py-1 text-sm font-medium ${filtro === "todos" ? "bg-white text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>Todas</button>
        {IMAGE_TYPES.map((tp) => (
          <button key={tp.id} onClick={() => setFiltro(tp.id)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-sm font-medium ${filtro === tp.id ? "bg-white text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
            <tp.Icon size={14} /> {tp.short}
          </button>
        ))}
      </div>
      <div className="gap-4 border-b border-slate-800 px-8 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500" style={{ display: "grid", gridTemplateColumns: COLS }}>
        <div>Estudio</div><div>Paciente</div><div>Origen</div><div>Detalle</div><div>Solicitado</div><div>Estado</div><div className="text-right">Espera</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activos.length === 0 && <div className="grid h-full place-items-center text-2xl text-slate-600">Sin estudios en cola</div>}
        {activos.map((s, i) => {
          const t = typeMeta(s.modalidad) || { short: s.modalidad, Icon: Hospital };
          const pr = PRIORITIES[s.prioridad] || PRIORITIES.normal;
          const e = ESTADO_BOARD[s.estado] || { label: s.estado, cls: "text-slate-300" };
          const reqAuth = s.historial?.[0]?.estado === "autorizacion_pendiente";
          const baseEspera = reqAuth ? (s.historial?.find((h) => h.estado !== "autorizacion_pendiente")?.ts ?? null) : s.fechaSolicitud;
          const mins = baseEspera != null ? waitMins(baseEspera, now) : null;
          const overdue = baseEspera != null && pr.umbralRojo != null && mins != null && mins > pr.umbralRojo;
          const p = s._paciente || { nombreCompleto: "—", hc: "—", cama: "—" };

          return (
            <div key={s.id} className={`gap-4 items-center border-b border-slate-800 px-8 py-3 ${i % 2 ? "bg-slate-900" : ""}`} style={{ display: "grid", gridTemplateColumns: COLS }}>
              <div className="flex items-center gap-2">
                <span className="h-7 w-1.5 shrink-0 rounded" style={{ background: pr.bar }} />
                <span className="inline-flex items-center gap-1.5 text-lg font-semibold"><t.Icon size={18} /> {t.short}</span>
              </div>
              <div className="truncate text-lg">
                <span className="font-semibold">{p.nombreCompleto}</span>
                <span className="ml-2 text-sm text-slate-400" style={{ fontFamily: FONT_MONO }}>HC {p.hc}</span>
                {s.prioridad === "urgente" && <span className="ml-2 inline-block rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold animate-pulse">CÓDIGO ROJO</span>}
              </div>
              <div className="truncate text-base text-slate-300">{s._servicio || "—"} · {p.cama}</div>
              <div className="truncate text-base text-slate-300">{s.descripcion}</div>
              <div className="text-base text-slate-400 tabular-nums" style={{ fontFamily: FONT_MONO }}>{fmtHora(s.fechaSolicitud)}</div>
              <div className={`text-lg font-bold ${e.cls}`}>{e.label}</div>
              <div className={`text-right text-2xl font-bold tabular-nums ${overdue ? "text-red-400" : "text-slate-200"}`} style={{ fontFamily: FONT_MONO }}>{baseEspera != null ? waitText(baseEspera, now) : "—"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
