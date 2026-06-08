import { useState } from 'react';
import { BarChart3, AlertTriangle, FilterX } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { IMAGE_TYPES, PRIORITIES, STATUS } from '../../utils/constants';
import { typeMeta } from '../../utils/helpers';
import type { Pedido } from '../../types';

const FONT_MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace";
const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#64748b'];

function duracionesEtapa(study: Pedido) {
  const h = study.historial || [];
  const d: Record<string, number> = {};
  for (let i = 0; i < h.length - 1; i++) {
    d[h[i].estado] = (d[h[i].estado] || 0) + (h[i + 1].ts - h[i].ts);
  }
  return d;
}

const fmtDur = (ms: number | null) => {
  if (ms == null || ms <= 0) return "—";
  const m = Math.round(ms / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
};

const prom = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

export function DashboardView({ studies: allStudies }: { studies: Pedido[] }) {
  const [filtroOS, setFiltroOS] = useState<string | null>(null);

  const obrasSociales: Record<string, number> = {};
  allStudies.forEach((s) => {
    const os = s._paciente?.obraSocial || 'Sin Obra Social';
    obrasSociales[os] = (obrasSociales[os] || 0) + 1;
  });
  const dataObrasSociales = Object.entries(obrasSociales)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const studies = filtroOS 
    ? allStudies.filter(s => (s._paciente?.obraSocial || 'Sin Obra Social') === filtroOS)
    : allStudies;

  const activos = studies.filter((s) => STATUS[s.estado]?.active).length;
  const realizados = studies.filter((s) => s.estado === "realizado");
  const cancelados = studies.filter((s) => s.estado === "cancelado").length;
  const rojos = studies.filter((s) => s.prioridad === "urgente");

  const etapas = [
    { key: "autorizacion_pendiente", label: "Autorización" },
    { key: "solicitado", label: "Espera (pendiente)" },
    { key: "traslado_solicitado", label: "Traslado" },
    { key: "en_proceso", label: "En proceso" },
  ];
  
  const etapaProm = etapas.map((e) => {
    const vals = studies.map((s) => duracionesEtapa(s)[e.key]).filter((v) => v != null && v > 0);
    return { ...e, ms: prom(vals), n: vals.length };
  });
  
  const maxEtapa = Math.max(1, ...etapaProm.map((e) => e.ms));

  const porModalidad = IMAGE_TYPES.map((t) => ({ label: t.short, n: studies.filter((s) => s.modalidad === t.id).length })).filter((x) => x.n > 0);
  const maxMod = Math.max(1, ...porModalidad.map((x) => x.n));

  const sectores: Record<string, number> = {};
  studies.forEach((s) => { 
    if (s._servicio) sectores[s._servicio] = (sectores[s._servicio] || 0) + 1; 
  });
  const porSector = Object.entries(sectores).map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
  const maxSec = Math.max(1, ...porSector.map((x) => x.n));

  const totalProm = prom(realizados.map((s) => { 
    const h = s.historial || []; 
    return h.length > 1 ? h[h.length - 1].ts - h[0].ts : 0; 
  }).filter((v) => v > 0));

  const rojoInicio = rojos.map((s) => { 
    const h = s.historial || []; 
    const ini = h.find((x) => x.estado === "en_proceso"); 
    return ini && h[0] ? ini.ts - h[0].ts : null; 
  }).filter((v) => v != null) as number[];
  
  const rojoFuera = rojoInicio.filter((v) => v > 30 * 60000).length;

  const exportarCSV = () => {
    const cols = ["HC", "Paciente", "Sector", "Modalidad", "Estudio", "Prioridad", "Estado", "Solicitado", "Autorización(min)", "Espera(min)", "Traslado(min)", "Proceso(min)"];
    const min = (ms?: number) => (ms ? Math.round(ms / 60000) : "");
    const filas = studies.map((s) => {
      const d = duracionesEtapa(s);
      return [
        s._paciente?.hc, s._paciente?.nombreCompleto, s._servicio, 
        typeMeta(s.modalidad)?.label, s.descripcion, PRIORITIES[s.prioridad]?.label, 
        STATUS[s.estado]?.label, new Date(s.fechaSolicitud).toLocaleString("es-AR"), 
        min(d.autorizacion_pendiente), min(d.solicitado), min(d.traslado_solicitado), min(d.en_proceso)
      ];
    });
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols, ...filas].map((r) => r.map(esc).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "imagenes-export.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const KPI = ({ label, value, sub }: { label: string, value: string | number, sub?: string }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
  
  const Barra = ({ label, n, max, texto, color = "#0f172a" }: { label: string, n: number, max: number, texto?: string, color?: string }) => (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-36 shrink-0 truncate text-slate-600">{label}</span>
      <div className="h-2.5 flex-1 rounded-full bg-slate-100">
        <div className="h-2.5 rounded-full" style={{ width: `${(n / max) * 100}%`, background: color }} />
      </div>
      <span className="w-20 shrink-0 text-right font-medium text-slate-700 tabular-nums" style={{ fontFamily: FONT_MONO }}>{texto ?? n}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Panel de gestión</h2>
          <p className="text-sm text-slate-500">Indicadores sobre el historial registrado.</p>
        </div>
        <button onClick={exportarCSV} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"><BarChart3 size={15} /> Exportar CSV</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KPI label="Total estudios" value={studies.length} />
        <KPI label="En cola" value={activos} />
        <KPI label="Realizados" value={realizados.length} />
        <KPI label="Cancelados" value={cancelados} />
        <KPI label="Código rojo" value={rojos.length} sub={rojoFuera > 0 ? `${rojoFuera} fuera de umbral` : "en umbral"} />
        <KPI label="Demora total prom." value={fmtDur(totalProm)} sub="realizados" />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Demora promedio por etapa</h3>
        <div className="space-y-2.5">
          {etapaProm.map((e) => <Barra key={e.key} label={e.label} n={e.ms} max={maxEtapa} texto={e.n ? fmtDur(e.ms) : "—"} color="#0ea5e9" />)}
        </div>
        <p className="mt-2 text-xs text-slate-400">Calculado entre cambios de estado consecutivos del historial.</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Volumen por modalidad</h3>
          <div className="space-y-2.5">
            {porModalidad.length === 0 ? <p className="text-sm text-slate-400">Sin datos.</p> : porModalidad.map((m) => <Barra key={m.label} label={m.label} n={m.n} max={maxMod} />)}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Volumen por sector solicitante</h3>
          <div className="space-y-2.5">
            {porSector.map((m) => <Barra key={m.label} label={m.label} n={m.n} max={maxSec} color="#8b5cf6" />)}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Obras Sociales</h3>
            {filtroOS && (
              <button onClick={() => setFiltroOS(null)} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-200">
                <FilterX size={12} /> Limpiar filtro
              </button>
            )}
          </div>
          <div className="flex-1 min-h-[200px]">
            {dataObrasSociales.length === 0 ? <p className="text-sm text-slate-400">Sin datos.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataObrasSociales}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {dataObrasSociales.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        onClick={() => setFiltroOS(filtroOS === entry.name ? null : entry.name)}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ opacity: filtroOS && filtroOS !== entry.name ? 0.3 : 1 }}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {dataObrasSociales.map((os, index) => (
              <div 
                key={os.name} 
                onClick={() => setFiltroOS(filtroOS === os.name ? null : os.name)}
                className={`flex items-center gap-1.5 cursor-pointer rounded px-1.5 py-0.5 hover:bg-slate-50 transition-colors ${filtroOS && filtroOS !== os.name ? 'opacity-40' : ''}`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="text-slate-600 font-medium">{os.name} ({os.value})</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-red-200 bg-red-50/50 p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-red-700"><AlertTriangle size={15} /> Código rojo</h3>
        <div className="grid grid-cols-3 gap-3">
          <div><div className="text-2xl font-bold text-slate-900 tabular-nums">{rojos.length}</div><div className="text-xs text-slate-500">total</div></div>
          <div><div className="text-2xl font-bold text-slate-900 tabular-nums">{rojoInicio.length ? fmtDur(prom(rojoInicio)) : "—"}</div><div className="text-xs text-slate-500">demora prom. al inicio</div></div>
          <div><div className="text-2xl font-bold text-slate-900 tabular-nums">{rojoFuera}</div><div className="text-xs text-slate-500">superaron 30 min</div></div>
        </div>
      </section>
    </div>
  );
}
