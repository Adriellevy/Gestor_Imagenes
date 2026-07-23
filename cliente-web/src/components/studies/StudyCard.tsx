import { useState } from 'react';
import {
  Clock, AlertTriangle, CheckCircle2, Play, X,
  ChevronDown, RotateCcw, Stethoscope, ShieldAlert, ShieldCheck, Truck, MessageCircle, Pencil, Lock, BedDouble, Layers, QrCode, FileText
} from "lucide-react";
import { typeMeta, waitMins, waitText, linkWhatsApp, fmtHora } from '../../utils/helpers';
import { PRIORITIES, STATUS, TRASLADOS, ESTADOS_PRE_TRASLADO, ROLES, MODALIDADES_PORTATIL } from '../../utils/constants';
import { Badge } from '../ui/Badge';
import { QrModal } from './QrModal';
import type { Pedido, Usuario } from '../../types';

const FONT_MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace";

interface StudyCardProps {
  study: Pedido;
  patientStudies?: Pedido[];
  usuarios: Usuario[];
  role: string;
  now: number;
  perms?: Record<string, boolean>;
  currentUser?: Usuario;
  onAdvance: (id: string) => void;
  onRevert: (id: string) => void;
  onAuthorize: (id: string) => void;
  onTransfer?: (id: string) => void;
  onEdit?: (study: Pedido) => void;
  onAvisado?: (id: string) => void;
  onEnOrigen?: (id: string) => void;
  onCancel: (id: string) => void;
  onMarcarVista?: (id: string) => void;
  onActualizarCama?: (study: Pedido, cama: string, sector?: string) => void;
}

export function StudyCard({
  study, patientStudies = [], usuarios, role, now, perms = {}, currentUser,
  onAdvance, onRevert, onAuthorize, onTransfer = () => { }, onEdit = () => { }, onAvisado = () => { }, onEnOrigen = () => { }, onCancel,
  onMarcarVista = () => { }, onActualizarCama = () => { }
}: StudyCardProps) {
  const [verHist, setVerHist] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [editingCama, setEditingCama] = useState(false);
  const [newCama, setNewCama] = useState(study._paciente?.cama || "");
  const t = typeMeta(study.modalidad) || { short: study.modalidad, Icon: Stethoscope, badge: "bg-gray-50 text-gray-700" };
  const pr = PRIORITIES[study.prioridad] || PRIORITIES.normal;
  const st = STATUS[study.estado] || { label: study.estado, active: false, badge: "bg-gray-50 text-gray-500" };

  // Si no está hidratado correctamente, previene error
  const p = study._paciente || { nombreCompleto: "—", hc: "—", dni: "—", edad: "—", cama: "—", obraSocial: undefined };

  const mins = waitMins(study.fechaSolicitud, now);
  const closed = study.estado === "realizado";
  const overdue = st.active && !closed && pr.umbralRojo != null && mins > pr.umbralRojo;

  const needsTransfer = TRASLADOS[study.tipoTraslado]?.requiereTraslado;
  const puedeGestionar = perms.cancelar_pedido && ESTADOS_PRE_TRASLADO.includes(study.estado) && (currentUser?.rol === "admin" || currentUser?.id === study.creadoPor);

  const hermanosIda = patientStudies.filter(x => x.id !== study.id && (x.estado === "solicitado" || x.estado === "traslado_solicitado") && TRASLADOS[x.tipoTraslado]?.requiereTraslado);
  const hermanos = patientStudies.filter(x => x.id !== study.id && STATUS[x.estado]?.active);
  const pendingSiblings = patientStudies
    .filter(x => x.id !== study.id && (x.estado === "solicitado" || x.estado === "traslado_solicitado" || x.estado === "autorizacion_pendiente" || x.estado === "en_proceso") && STATUS[x.estado]?.active)
    .sort((a, b) => ((PRIORITIES[a.prioridad]?.rank ?? 99) - (PRIORITIES[b.prioridad]?.rank ?? 99)) || (a.fechaSolicitud - b.fechaSolicitud));

  const nextAction = () => {
    if (study.estado === "autorizacion_pendiente") return { label: "Autorizar", Icon: ShieldCheck, cls: "bg-orange-600 hover:bg-orange-700", authorize: true, perm: "autorizar" };
    if (study.estado === "solicitado") return needsTransfer
      ? { label: "Solicitar traslado", Icon: Truck, cls: "bg-cyan-600 hover:bg-cyan-700", transfer: true, perm: "iniciar" }
      : { label: "Comenzar", Icon: Play, cls: "bg-blue-600 hover:bg-blue-700", perm: "iniciar" };
    if (study.estado === "traslado_solicitado") return { label: "Comenzar", Icon: Play, cls: "bg-blue-600 hover:bg-blue-700", perm: "iniciar" };
    if (study.estado === "en_proceso") return needsTransfer
      ? { label: "Estudio finalizado", Icon: Truck, cls: "bg-purple-600 hover:bg-purple-700", returnTransfer: true, perm: "finalizar" }
      : { label: "Estudio finalizado", Icon: CheckCircle2, cls: "bg-emerald-600 hover:bg-emerald-700", perm: "finalizar" };
    return null;
  };

  const na = nextAction();
  const puedeAccion = na && perms[na.perm];

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow duration-200 hover:shadow-md" style={{ opacity: closed ? 0.72 : 1 }}>
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: pr.bar }} />
      <div className="pl-4 pr-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-slate-900">{p.nombreCompleto}</p>
              {study.prioridad !== "normal" && (
                <Badge className={pr.badge}>{study.prioridad === "urgente" && <AlertTriangle size={11} />} {pr.short ?? pr.label}</Badge>
              )}
              {study.prioridad === "urgente" && !study.emergenciaVista && !closed && (
                <button
                  onClick={() => onMarcarVista(study.id)}
                  className="inline-flex animate-pulse items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105 hover:bg-red-700"
                  title="Detener alarma y acusar recibo de código rojo"
                >
                  <AlertTriangle size={11} /> VISTO
                </button>
              )}
              {study.estado === "autorizacion_pendiente" && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200"><ShieldAlert size={11} /> Autorización</Badge>
              )}
              {study.estado === "traslado_solicitado" && (
                <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200"><Truck size={11} /> Traslado solicitado</Badge>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500" style={{ fontFamily: FONT_MONO }}>
              <span>HC {p.hc}</span><span>DNI {p.dni}</span><span>{p.edad} años</span>
              {p.obraSocial && <span className="font-semibold text-blue-600 font-sans">{p.obraSocial}</span>}
              <span className="inline-flex items-center gap-1 font-sans">
                <BedDouble size={12} />
                {editingCama ? (
                  <span className="inline-flex items-center gap-1">
                    <input
                      type="text"
                      value={newCama}
                      onChange={(e) => setNewCama(e.target.value)}
                      className="w-16 rounded border border-blue-400 px-1 py-0 text-xs text-slate-800 outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        onActualizarCama(study, newCama);
                        setEditingCama(false);
                      }}
                      className="rounded bg-blue-600 px-1.5 py-0 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditingCama(false)}
                      className="rounded bg-slate-200 px-1.5 py-0 text-xs font-medium text-slate-600 hover:bg-slate-300"
                    >
                      ✕
                    </button>
                  </span>
                ) : (
                  <span
                    onClick={() => {
                      setNewCama(p.cama);
                      setEditingCama(true);
                    }}
                    className="cursor-pointer underline decoration-dotted underline-offset-2 hover:text-blue-600"
                    title="Clic para editar cama en caliente"
                  >
                    {p.cama}
                  </span>
                )}
              </span>
            </div>
          </div>
          <Badge className={`${t.badge} shrink-0`}><t.Icon size={12} /> {t.short}</Badge>
        </div>

        <p className="mt-2 text-sm font-medium text-slate-800">{study.descripcion}</p>
        {study.motivo && <p className="mt-0.5 text-xs leading-snug text-slate-500">{study.motivo}</p>}
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><Truck size={12} className="text-slate-400" /> {TRASLADOS[study.tipoTraslado]?.label ?? "—"}{!needsTransfer && <span className="text-slate-400"> · sin traslado</span>}</p>
        {study.ordenMedica ? (
          <a href={study.ordenMedica.datos} download={study.ordenMedica.nombre} className="mt-1 ml-2 inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"><FileText size={12} /> Descargar orden médica</a>
        ) : study.estado === "autorizacion_pendiente" ? (
          <span className="mt-1 ml-2 inline-flex items-center gap-1 text-xs text-amber-600"><AlertTriangle size={11} /> Sin orden médica adjunta</span>
        ) : null}
        {study.tipoTraslado === "ambulatorio" && (
          <button onClick={() => setQrOpen(true)} className="mt-1 ml-2 inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"><QrCode size={12} /> QR para el paciente</button>
        )}
        {qrOpen && <QrModal study={study} onClose={() => setQrOpen(false)} />}
        {hermanos.length > 0 && (
          <p className={`mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${study.estado === "en_proceso" ? "bg-amber-50 text-amber-700" : "bg-violet-50 text-violet-700"}`}>
            <Layers size={11} /> {study.estado === "en_proceso"
              ? `Quedan ${hermanos.length} estudio${hermanos.length > 1 ? "s" : ""} de este paciente — no devolver aún`
              : `+${hermanos.length} de este paciente: ${[...new Set(hermanos.map((h) => typeMeta(h.modalidad)?.short))].join(", ")}`}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 text-slate-400"><Stethoscope size={12} /> {study._servicio || "—"}</span>
            <span aria-hidden>·</span>
            <span className={`inline-flex items-center gap-1 ${overdue ? "font-semibold text-red-600" : ""}`} style={{ fontFamily: FONT_MONO }}>
              <Clock size={12} /> {waitText(study.fechaSolicitud, now)}
            </span>
          </div>

          {role === "imaging" ? (
            <div className="flex items-center gap-1.5">
              {perms.retroceder && st.active && study.estado !== "solicitado" && study.estado !== "autorizacion_pendiente" && (
                <button onClick={() => onRevert(study.id)} title="Retroceder estado" className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"><RotateCcw size={13} /></button>
              )}
              {study.estado === "traslado_solicitado" && puedeAccion && (
                <a href={linkWhatsApp(study, "ida", hermanosIda)} target="_blank" rel="noopener noreferrer" title="Reenviar WhatsApp al ayudante" className="grid h-7 w-7 place-items-center rounded-lg border border-cyan-200 text-cyan-600 transition-colors hover:bg-cyan-50"><MessageCircle size={13} /></a>
              )}
              {na && puedeAccion && (
                na.transfer ? (
                  <a href={linkWhatsApp(study, "ida", hermanosIda)} target="_blank" rel="noopener noreferrer" onClick={() => onTransfer(study.id)} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-white transition-colors ${na.cls}`}>
                    <na.Icon size={12} /> {na.label}
                  </a>
                ) : na.returnTransfer ? (
                  <a href={linkWhatsApp(study, "vuelta", pendingSiblings)} target="_blank" rel="noopener noreferrer" onClick={() => {
                    onAdvance(study.id);
                    const ns = pendingSiblings.find(x => x.estado === "solicitado" && TRASLADOS[x.tipoTraslado]?.requiereTraslado);
                    if (ns) {
                      onTransfer?.(ns.id);
                    }
                  }} title="Avisa el traslado al siguiente paso y marca como finalizado" className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-white transition-colors ${na.cls}`}>
                    <na.Icon size={12} /> {na.label}
                  </a>
                ) : (
                  <button onClick={() => (na.authorize ? onAuthorize(study.id) : onAdvance(study.id))} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-white transition-colors ${na.cls}`}>
                    <na.Icon size={12} /> {na.label}
                  </button>
                )
              )}
              {MODALIDADES_PORTATIL.includes(study.modalidad) && needsTransfer && perms.iniciar && (study.estado === "solicitado" || study.estado === "traslado_solicitado") && (
                study.estado === "traslado_solicitado" ? (
                  <a href={linkWhatsApp(study, "sintraslado")} target="_blank" rel="noopener noreferrer" onClick={() => onEnOrigen?.(study.id)} title="Hacer en la cama del paciente (portátil, sin traslado) y avisar al ayudante" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"><BedDouble size={12} /> Hacer en origen</a>
                ) : (
                  <button onClick={() => onEnOrigen?.(study.id)} title="Hacer en la cama del paciente (portátil, sin traslado)" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"><BedDouble size={12} /> Hacer en origen</button>
                )
              )}
              {na && !puedeAccion && study.estado === "autorizacion_pendiente" && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600"><Lock size={11} /> Esperando autorización</span>
              )}
              {closed && perms.retroceder && (
                <button onClick={() => onRevert(study.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50"><RotateCcw size={12} /> Reabrir</button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Badge className={st.badge}>{st.label}</Badge>
              {puedeGestionar && (
                <>
                  <button onClick={() => onEdit(study)} title="Editar pedido" className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"><Pencil size={13} /></button>
                  {study.estado === "traslado_solicitado" ? (
                    <a href={linkWhatsApp(study, "cancel")} target="_blank" rel="noopener noreferrer" onClick={() => onCancel(study.id)} title="Cancelar y avisar al ayudante" className="grid h-7 w-7 place-items-center rounded-lg border border-red-200 text-red-500 transition-colors hover:bg-red-50"><X size={13} /></a>
                  ) : (
                    <button onClick={() => onCancel(study.id)} title="Cancelar pedido" className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"><X size={13} /></button>
                  )}
                </>
              )}
              {study.avisoPendiente && (
                <a href={linkWhatsApp(study, study.avisoPendiente)} target="_blank" rel="noopener noreferrer" onClick={() => onAvisado(study.id)} title="Avisar al ayudante" className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"><MessageCircle size={12} /> {study.avisoPendiente === "modif" ? "Avisar cambio" : "Avisar cancelación"}</a>
              )}
            </div>
          )}
        </div>
        {currentUser?.rol === "admin" && study.historial && study.historial.length > 0 && (
          <div className="mt-2.5 border-t border-slate-100 pt-2">
            <button onClick={() => setVerHist((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600">
              <ChevronDown size={12} className={verHist ? "rotate-180" : ""} /> Historial ({study.historial.length})
            </button>
            {verHist && (
              <ol className="mt-1.5 space-y-1">
                {study.historial.map((h, i) => {
                  const u = usuarios.find((x: any) => x.id === h.por);
                  return (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <span className="shrink-0 text-slate-400" style={{ fontFamily: FONT_MONO }}>{fmtHora(h.ts)}</span>
                      <span className="font-medium text-slate-600">{STATUS[h.estado]?.label ?? h.estado}</span>
                      <span className="truncate text-slate-400">· {u ? `${u.nombre} (${(ROLES as any)[u.rol]?.label ?? u.rol})` : "—"}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
