import { useState, useEffect, useMemo } from "react";
import {
  Activity, Plus, Search, Clock, AlertTriangle, CheckCircle2, Play, X,
  ChevronDown, RotateCcw, Stethoscope, Bone, Brain, Waves, Scan,
  Hospital, ListChecks, BedDouble, Filter, HeartPulse, Radiation, ShieldAlert, ShieldCheck, Truck, MessageCircle, Pencil,
  Users, Check, Lock, UserCircle, Monitor, BarChart3, LogOut, Layers, QrCode, Download,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   CAPA DE DATOS  —  normalizada según el modelo (Paciente/Internación/Pedido)
   ═══════════════════════════════════════════════════════════════════ */

const FONT_SANS = "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace";

// Persistencia del prototipo: almacenamiento del entorno de artifacts (sobrevive recargas).
const STORE = (typeof window !== "undefined" && window.storage) ? window.storage : null;
const STORE_KEY = "imagenes:estado";

const IMAGE_TYPES = [
  { id: "rx",        label: "Radiología",       short: "Rx",      dicom: "CR/DX", requiereAutorizacion: false, Icon: Bone,       badge: "bg-sky-50 text-sky-700 border-sky-200" },
  { id: "tc",        label: "Tomografía",       short: "TC",      dicom: "CT",    requiereAutorizacion: true,  Icon: Scan,       badge: "bg-violet-50 text-violet-700 border-violet-200" },
  { id: "rm",        label: "Resonancia",       short: "RM",      dicom: "MR",    requiereAutorizacion: true,  Icon: Brain,      badge: "bg-teal-50 text-teal-700 border-teal-200" },
  { id: "eco",       label: "Ecografía",        short: "Eco",     dicom: "US",    requiereAutorizacion: false, Icon: Waves,      badge: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "ecocardio", label: "Ecocardiografía",  short: "EcoC",    dicom: "US",    requiereAutorizacion: false, Icon: HeartPulse, badge: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "mn",        label: "Medicina nuclear", short: "MN",      dicom: "NM",    requiereAutorizacion: true,  Icon: Radiation,  badge: "bg-lime-50 text-lime-700 border-lime-200" },
];
const requiereAuth = (modalidad) => Boolean(typeMeta(modalidad)?.requiereAutorizacion);
const typeMeta = (id) => IMAGE_TYPES.find((t) => t.id === id);

/* ── Usuarios, roles y permisos ─────────────────────────────────────────
   Permisos basados en capacidades. Cada rol agrupa capacidades; cada usuario
   tiene un rol y, opcionalmente, un alcance (un servicio, o sectores de imágenes).
   En producción esto vendría del IAM del hospital; acá es un padrón de prueba. */
const PERMISOS = {
  pedir_estudio:      "Solicitar estudios",
  cancelar_pedido:    "Cancelar pedidos",
  autorizar:          "Autorización administrativa",
  iniciar:            "Iniciar / dar ingreso",
  finalizar:          "Finalizar (realizado)",
  retroceder:         "Retroceder estado",
  ver_imagenes:       "Ver worklist de imágenes",
  ver_servicio:       "Ver lista del servicio",
  gestionar_usuarios: "Gestionar usuarios",
};
const PERMISOS_ALL = Object.keys(PERMISOS);

const ROLES = {
  medico:         { label: "Médico solicitante", color: "#2563eb", permisos: ["pedir_estudio", "cancelar_pedido", "ver_servicio", "ver_imagenes"] },
  tecnico:        { label: "Personal de imágenes", color: "#0d9488", permisos: ["iniciar", "finalizar", "retroceder", "ver_imagenes"] },
  administrativo: { label: "Administrativo",       color: "#ea580c", permisos: ["autorizar", "ver_imagenes"] },
  admin:          { label: "Admin general",        color: "#7c3aed", permisos: PERMISOS_ALL },
};

const USUARIOS = [
  { id: "u1", nombre: "Dra. Acosta", rol: "medico",         servicio: "Clínica médica (7mo piso A)" },
  { id: "u2", nombre: "Dr. Benítez", rol: "medico",         servicio: "UCO" },
  { id: "u3", nombre: "Téc. Ríos",   rol: "tecnico",        sectores: [] },  // personal de imágenes: accede a todas las modalidades
  { id: "u4", nombre: "Téc. Molina", rol: "tecnico",        sectores: [] },  // personal de imágenes: accede a todas las modalidades
  { id: "u5", nombre: "Adm. Torres", rol: "administrativo" },
  { id: "u6", nombre: "Sistemas",    rol: "admin" },
];
const tienePermiso = (usuario, permiso) => !!usuario && (ROLES[usuario.rol]?.permisos.includes(permiso) ?? false);
const vistasPermitidas = (usuario) => {
  const v = [];
  if (tienePermiso(usuario, "ver_imagenes")) v.push("imaging");
  if (tienePermiso(usuario, "ver_servicio")) v.push("clinical");
  if (tienePermiso(usuario, "gestionar_usuarios")) v.push("users");
  if (usuario.rol === "admin") v.push("dashboard");
  return v;
};

/* Áreas de internación (antes "sectores"): unidad organizativa que pide estudios y a la
   que pertenece el médico (reemplazan a los antiguos "servicios"). Los campos
   de datos llamados servicio/servicioId/servicioSolicitanteId ahora refieren
   a estos sectores. */
const SECTORES = [
  "Guardia", "UCO", "Recuperación cardiovascular", "Telemetría",
  "Quirófano 1 (3er piso)", "Quirófano 2 (4to piso)",
  "UTI 1 (5to piso)", "UTI 2 (6to piso)",
  "Clínica médica (7mo piso A)", "Clínica médica (7mo piso B)",
  "Clínica médica (8vo piso A)", "Clínica médica (8vo piso B)",
  "Clínica médica - TMO (9no piso A)", "Clínica médica (9no piso B)",
  "Internación ambulatoria",
];

const PRIORITIES = {
  urgente:     { label: "Urgente - código rojo", short: "Código rojo", badge: "bg-red-50 text-red-700 border-red-200",        bar: "#dc2626", rank: 0, umbralRojo: 10,  umbralAlerta: 30 },
  prioritario: { label: "Prioridad",             short: "Prioridad",   badge: "bg-amber-50 text-amber-700 border-amber-200",  bar: "#d97706", rank: 1, umbralRojo: 120, umbralAlerta: 120 },
  normal:      { label: "Normal",                short: "Normal",      badge: "bg-slate-100 text-slate-600 border-slate-200", bar: "#cbd5e1", rank: 2, umbralRojo: null, umbralAlerta: null },
};

/* Alerta de demora en el sector de imágenes: devuelve la prioridad si el estudio
   activo superó su umbral de alerta (código rojo 30 min, prioridad 2 h). */
function alertaDemora(study, now) {
  const pr = PRIORITIES[study.prioridad];
  if (!STATUS[study.estado]?.active || pr.umbralAlerta == null) return null;
  return waitMins(study.fechaSolicitud, now) > pr.umbralAlerta ? study.prioridad : null;
}

/* Lista cerrada de casos código rojo: (modalidad + diagnóstico) → estudio.
   Solo estos habilitan código rojo; cualquier otro caso va como "Prioridad". */
const CASOS_CODIGO_ROJO = [
  { modalidad: "tc", dx: "TEP",               estudio: "Angiotomografía de tórax (protocolo TEP)",                  conContraste: true },
  { modalidad: "tc", dx: "Síndrome aórtico",  estudio: "Angiotomografía de aorta",                                  conContraste: true },
  { modalidad: "tc", dx: "ACV",               estudio: "Angiotomografía de encéfalo (vasos intra y extracraneanos)", conContraste: true },
  { modalidad: "rm", dx: "ACV",               estudio: "RMN de encéfalo (protocolo stroke)",                        conContraste: false },
  { modalidad: "rx", dx: "Neumotórax",        estudio: "Rx de tórax",                                               conContraste: false, tipoTraslado: "habitacion" },
  { modalidad: "ecocardio", dx: "Sospecha de taponamiento", estudio: "Ecocardiograma de urgencia (descartar taponamiento)", conContraste: false, tipoTraslado: "habitacion" },
];

/* Ciclo de vida del pedido en este worklist:
   [autorizacion_pendiente ->] solicitado -> en_proceso -> realizado.
   El paso de autorización solo aplica a estudios cuya modalidad lo requiere.
   "realizado" cierra el circuito (este tablero no incluye el paso de informe). */
const STATUS = {
  autorizacion_pendiente: { label: "Autorización pendiente", badge: "bg-orange-100 text-orange-700", rank: -1, active: true },
  solicitado:          { label: "Pendiente",           badge: "bg-slate-100 text-slate-600",   rank: 0, active: true },
  traslado_solicitado: { label: "Traslado solicitado", badge: "bg-cyan-50 text-cyan-700",       rank: 1, active: true },
  en_proceso:          { label: "En proceso",          badge: "bg-blue-50 text-blue-700",      rank: 2, active: true },
  realizado:           { label: "Realizado",           badge: "bg-emerald-50 text-emerald-700", rank: 3, active: false },
  cancelado:           { label: "Cancelado",           badge: "bg-rose-50 text-rose-700",      rank: 9, active: false },
};

/* Tipos de traslado del paciente. requiereTraslado=false ⇒ no interviene el
   ayudante: el estudio saltea el paso de traslado y va directo a realizarse. */
const TRASLADOS = {
  silla:       { label: "Silla de ruedas",        requiereTraslado: true },
  camilla:     { label: "Camilla",                requiereTraslado: true },
  asistido:    { label: "Traslado asistido",      requiereTraslado: true },
  habitacion:  { label: "En habitación",          requiereTraslado: false },
  ambulatorio: { label: "Por sus propios medios", requiereTraslado: false },
};
const MODALIDADES_PORTATIL = ["rx", "eco", "ecocardio"];
const opcionesTraslado = (modalidad, sector) => {
  const ops = ["silla", "camilla", "asistido"];
  if (MODALIDADES_PORTATIL.includes(modalidad)) ops.push("habitacion");  // estudio portátil / a la cama
  if (sector === "Guardia") ops.push("ambulatorio");                     // "por sus propios medios": solo en Guardia
  return ops;
};

/* Notificación al ayudante: abre WhatsApp con el mensaje precargado. El número/
   grupo/central es configurable; luego se integra al módulo de traslados. */
const NUMERO_TRASLADOS = "5491100000000";
function mensajeTraslado(study, tipo = "ida", hermanos = []) {
  const imagenes = typeMeta(study.modalidad)?.label ?? "Imágenes";
  const ubic = `${study._servicio} - ${study._paciente.cama}`;
  const tr = TRASLADOS[study.tipoTraslado]?.label ?? "—";
  const paciente = `Paciente: ${study._paciente.nombreCompleto} (HC ${study._paciente.hc})`;
  const vuelta = tipo === "vuelta";
  const lineas =
    tipo === "cancel"      ? ["TRASLADO CANCELADO", paciente, `Ubicación: ${ubic}`, "Estudio suspendido."] :
    tipo === "sintraslado" ? ["TRASLADO CANCELADO", paciente, `Ubicación: ${ubic}`, "El estudio se realizará sin traslado."] :
    tipo === "modif"       ? ["TRASLADO MODIFICADO", paciente, `Ubicación: ${ubic}`, `Nuevo medio: ${tr}`] :
    [
      vuelta ? "Solicitud de traslado (regreso a origen)" : "Solicitud de traslado",
      paciente,
      ...(study.aislamiento ? ["AISLAMIENTO: requiere precauciones (traer EPP)."] : []),
      ...(vuelta ? [`Desde: ${imagenes}`, `Hacia: ${ubic}`] : [`Origen: ${ubic}`, `Destino: ${imagenes}`]),
      `Traslado: ${tr}`,
      `Estudio: ${study.descripcion}${vuelta ? " (finalizado)" : ""}`,
      ...(!vuelta && hermanos.length ? [`Otros estudios del paciente: ${hermanos.map((h) => `${typeMeta(h.modalidad)?.short} ${h.descripcion}`).join("; ")}`] : []),
      `Prioridad: ${PRIORITIES[study.prioridad]?.label}`,
    ];
  return lineas.join("\n");
}
const linkWhatsApp = (study, tipo = "ida", hermanos = []) => `https://wa.me/${NUMERO_TRASLADOS}?text=${encodeURIComponent(mensajeTraslado(study, tipo, hermanos))}`;

const fmtHora = (ts) => new Date(ts).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
const fmtFecha = (ts) => ts ? new Date(ts).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

// Línea de tiempo plausible para los datos de ejemplo (en vivo el historial se registra real).
const SEC_ESTADO = ["autorizacion_pendiente", "solicitado", "traslado_solicitado", "en_proceso", "realizado"];
function historialSeed(p) {
  const requiereT = TRASLADOS[p.tipoTraslado]?.requiereTraslado;
  const arrancaAuth = requiereAuth(p.modalidad) && p.prioridad !== "urgente";
  let camino;
  if (p.estado === "cancelado") {
    camino = [arrancaAuth ? "autorizacion_pendiente" : "solicitado", "cancelado"];
  } else {
    camino = SEC_ESTADO.filter((e) => (e !== "autorizacion_pendiente" || arrancaAuth) && (e !== "traslado_solicitado" || requiereT));
    const corte = camino.indexOf(p.estado);
    camino = corte >= 0 ? camino.slice(0, corte + 1) : [p.estado];
  }
  const actor = { autorizacion_pendiente: p.creadoPor ?? null, solicitado: arrancaAuth ? "u5" : (p.creadoPor ?? null), traslado_solicitado: "u3", en_proceso: "u3", realizado: "u3", cancelado: p.creadoPor ?? null };
  return camino.map((e, i) => ({ estado: e, ts: p.fechaSolicitud + i * 5 * 60000, por: actor[e] ?? null }));
}

/* Vista mural tipo tablero de aeropuerto: solo lectura, letra grande, para dejar
   en una pantalla del sector de imágenes. Privacidad: apellido + HC + cama/sector. */
function BoardView({ studies, now, onExit }) {
  const [reloj, setReloj] = useState(Date.now());
  const [filtro, setFiltro] = useState("todos");
  useEffect(() => { const t = setInterval(() => setReloj(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ESTADO_BOARD = {
    autorizacion_pendiente: { label: "AUTORIZAR",   cls: "text-amber-300" },
    solicitado:             { label: "PENDIENTE",   cls: "text-slate-100" },
    traslado_solicitado:    { label: "EN TRASLADO", cls: "text-cyan-300" },
    en_proceso:             { label: "EN PROCESO",  cls: "text-blue-300" },
  };
  const COLS = "1fr 2fr 1.6fr 2.2fr 0.9fr 1.2fr 0.9fr";
  const activos = studies
    .filter((s) => STATUS[s.estado]?.active && (filtro === "todos" || s.modalidad === filtro))
    .sort((a, b) => (PRIORITIES[a.prioridad].rank - PRIORITIES[b.prioridad].rank) || (a.fechaSolicitud - b.fechaSolicitud));
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
          <button key={tp.id} onClick={() => setFiltro(tp.id)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-sm font-medium ${filtro === tp.id ? "bg-white text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}><tp.Icon size={14} /> {tp.short}</button>
        ))}
      </div>
      <div className="gap-4 border-b border-slate-800 px-8 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500" style={{ display: "grid", gridTemplateColumns: COLS }}>
        <div>Estudio</div><div>Paciente</div><div>Origen</div><div>Detalle</div><div>Solicitado</div><div>Estado</div><div className="text-right">Espera</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activos.length === 0 && <div className="grid h-full place-items-center text-2xl text-slate-600">Sin estudios en cola</div>}
        {activos.map((s, i) => {
          const t = typeMeta(s.modalidad);
          const pr = PRIORITIES[s.prioridad];
          const e = ESTADO_BOARD[s.estado] || { label: s.estado, cls: "text-slate-300" };
          // Si el estudio requirió autorización, la espera se cuenta desde la autorización (no desde la solicitud).
          const reqAuth = s.historial?.[0]?.estado === "autorizacion_pendiente";
          const baseEspera = reqAuth ? (s.historial.find((h) => h.estado !== "autorizacion_pendiente")?.ts ?? null) : s.fechaSolicitud;
          const mins = baseEspera != null ? waitMins(baseEspera, now) : null;
          const overdue = baseEspera != null && pr.umbralRojo != null && mins > pr.umbralRojo;
          return (
            <div key={s.id} className={`gap-4 items-center border-b border-slate-800 px-8 py-3 ${i % 2 ? "bg-slate-900" : ""}`} style={{ display: "grid", gridTemplateColumns: COLS }}>
              <div className="flex items-center gap-2">
                <span className="h-7 w-1.5 shrink-0 rounded" style={{ background: pr.bar }} />
                <span className="inline-flex items-center gap-1.5 text-lg font-semibold"><t.Icon size={18} /> {t.short}</span>
              </div>
              <div className="truncate text-lg">
                <span className="font-semibold">{s._paciente.nombreCompleto}</span>
                <span className="ml-2 text-sm text-slate-400" style={{ fontFamily: FONT_MONO }}>HC {s._paciente.hc}</span>
                {s.prioridad === "urgente" && <span className="ml-2 inline-block rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold animate-pulse">CÓDIGO ROJO</span>}
                {s.aislamiento && <span className="ml-2 inline-block rounded bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-slate-900">AISLAMIENTO</span>}
              </div>
              <div className="truncate text-base text-slate-300">{s._servicio} · {s._paciente.cama}</div>
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

// Estados en los que el pedido aún puede cancelarse/editarse (paciente no trasladado).
const ESTADOS_PRE_TRASLADO = ["autorizacion_pendiente", "solicitado", "traslado_solicitado"];

const minsAgo = (m) => Date.now() - m * 60000;
const uid = (p = "") => p + Math.random().toString(36).slice(2, 9);
const today = (y, mo, d) => new Date(y, mo - 1, d).toISOString();

/* ── Datos de prueba NORMALIZADOS ──────────────────────────────────── */

const PACIENTES = [
  { id: "p1",  hc: "1042318", documento: { tipo: "DNI", numero: "28.945.110" }, apellido: "González", nombre: "Marta",       fechaNacimiento: today(1958, 4, 12),  sexo: "F", obraSocial: "OSDE" },
  { id: "p2",  hc: "1038945", documento: { tipo: "DNI", numero: "20.114.876" }, apellido: "Pereyra",  nombre: "Jorge",       fechaNacimiento: today(1953, 9, 3),   sexo: "M", obraSocial: "PAMI" },
  { id: "p3",  hc: "1095102", documento: { tipo: "DNI", numero: "41.302.559" }, apellido: "Fernández",nombre: "Lucía",       fechaNacimiento: today(2017, 6, 21),  sexo: "F", obraSocial: "Swiss Medical" },
  { id: "p4",  hc: "1051877", documento: { tipo: "DNI", numero: "16.778.234" }, apellido: "Sosa",     nombre: "Roberto",     fechaNacimiento: today(1967, 1, 30),  sexo: "M", obraSocial: "Galeno" },
  { id: "p5",  hc: "1063340", documento: { tipo: "DNI", numero: "33.567.901" }, apellido: "Díaz",     nombre: "Ana Beatriz", fechaNacimiento: today(1980, 11, 8),  sexo: "F", obraSocial: "Swiss Medical" },
  { id: "p6",  hc: "1009921", documento: { tipo: "DNI", numero: "12.090.443" }, apellido: "Ramírez",  nombre: "Héctor",      fechaNacimiento: today(1945, 3, 17),  sexo: "M", obraSocial: "PAMI" },
  { id: "p7",  hc: "1087654", documento: { tipo: "DNI", numero: "39.811.276" }, apellido: "Castro",   nombre: "Sofía",       fechaNacimiento: today(1991, 7, 2),   sexo: "F", obraSocial: "OSDE" },
  { id: "p8",  hc: "1029013", documento: { tipo: "DNI", numero: "25.443.668" }, apellido: "Ibáñez",   nombre: "Daniel",      fechaNacimiento: today(1964, 12, 19), sexo: "M", obraSocial: "OSECAC" },
  { id: "p9",  hc: "1071266", documento: { tipo: "DNI", numero: "30.225.187" }, apellido: "Núñez",    nombre: "Valeria",     fechaNacimiento: today(1996, 5, 27),  sexo: "F", obraSocial: "Particular" },
  { id: "p10", hc: "1014488", documento: { tipo: "DNI", numero: "14.556.029" }, apellido: "Paz",      nombre: "Miguel Ángel",fechaNacimiento: today(1949, 8, 14),  sexo: "M", obraSocial: "PAMI" },
  { id: "p11", hc: "1080557", documento: { tipo: "DNI", numero: "37.901.554" }, apellido: "Medina",   nombre: "Carla",       fechaNacimiento: today(1973, 2, 9),   sexo: "F", obraSocial: "IOMA" },
];

const INTERNACIONES = [
  { id: "i1",  pacienteId: "p1",  servicioId: "UCO",                         ubicacion: { sector: "UCO",                         habitacion: "—",   cama: "UCO 2" },   fechaIngreso: minsAgo(2880), fechaAlta: null, estado: "activa" },
  { id: "i2",  pacienteId: "p2",  servicioId: "UTI 1 (5to piso)",            ubicacion: { sector: "UTI 1 (5to piso)",            habitacion: "—",   cama: "UTI1 3" },  fechaIngreso: minsAgo(5760), fechaAlta: null, estado: "activa" },
  { id: "i3",  pacienteId: "p3",  servicioId: "Clínica médica (9no piso B)", ubicacion: { sector: "Clínica médica (9no piso B)", habitacion: "905", cama: "Cama 905" }, fechaIngreso: minsAgo(1440), fechaAlta: null, estado: "activa" },
  { id: "i4",  pacienteId: "p4",  servicioId: "Telemetría",                  ubicacion: { sector: "Telemetría",                  habitacion: "—",   cama: "Tele 4" },  fechaIngreso: minsAgo(4320), fechaAlta: null, estado: "activa" },
  { id: "i5",  pacienteId: "p5",  servicioId: "Clínica médica (8vo piso A)", ubicacion: { sector: "Clínica médica (8vo piso A)", habitacion: "818", cama: "Cama 818" }, fechaIngreso: minsAgo(2160), fechaAlta: null, estado: "activa" },
  { id: "i6",  pacienteId: "p6",  servicioId: "Clínica médica (7mo piso A)", ubicacion: { sector: "Clínica médica (7mo piso A)", habitacion: "707", cama: "Cama 707" }, fechaIngreso: minsAgo(7200), fechaAlta: null, estado: "activa" },
  { id: "i7",  pacienteId: "p7",  servicioId: "Recuperación cardiovascular", ubicacion: { sector: "Recuperación cardiovascular", habitacion: "—",   cama: "RCV 1" },   fechaIngreso: minsAgo(720),  fechaAlta: null, estado: "activa" },
  { id: "i8",  pacienteId: "p8",  servicioId: "UTI 2 (6to piso)",            ubicacion: { sector: "UTI 2 (6to piso)",            habitacion: "—",   cama: "UTI2 2" },  fechaIngreso: minsAgo(8640), fechaAlta: null, estado: "activa" },
  { id: "i9",  pacienteId: "p9",  servicioId: "Guardia",                     ubicacion: { sector: "Guardia",                     habitacion: "—",   cama: "Guardia 2" }, fechaIngreso: minsAgo(360),  fechaAlta: null, estado: "activa" },
  { id: "i10", pacienteId: "p10", servicioId: "Clínica médica (8vo piso B)", ubicacion: { sector: "Clínica médica (8vo piso B)", habitacion: "809", cama: "Cama 809" }, fechaIngreso: minsAgo(2520), fechaAlta: null, estado: "activa" },
  { id: "i11", pacienteId: "p11", servicioId: "Telemetría",                  ubicacion: { sector: "Telemetría",                  habitacion: "—",   cama: "Tele 2" },  fechaIngreso: minsAgo(1080), fechaAlta: null, estado: "activa" },
];

const PEDIDOS_SEED = [
  { id: uid("ped_"), internacionId: "i1",  servicioSolicitanteId: "UCO", creadoPor: "u2",    modalidad: "tc",  descripcion: "Angiotomografía de encéfalo (vasos intra y extracraneanos)", tipoTraslado: "camilla", regionAnatomica: "Encéfalo", conContraste: true,  prioridad: "urgente",     estado: "solicitado", motivo: "ACV",   fechaSolicitud: minsAgo(54) },
  { id: uid("ped_"), internacionId: "i2",  servicioSolicitanteId: "UTI 1 (5to piso)", modalidad: "rx",  descripcion: "Rx de tórax portátil", tipoTraslado: "habitacion",                regionAnatomica: "Tórax",            conContraste: false, prioridad: "urgente",     aislamiento: true, estado: "en_proceso", motivo: "Control de vía central.",                     fechaSolicitud: minsAgo(38) },
  { id: uid("ped_"), internacionId: "i3",  servicioSolicitanteId: "Clínica médica (9no piso B)",         modalidad: "rx",  descripcion: "Rx de muñeca derecha (F y P)", tipoTraslado: "silla",        regionAnatomica: "Muñeca", lateralidad: "derecha", conContraste: false, prioridad: "prioritario", estado: "solicitado", motivo: "Traumatismo, sospecha de fractura.",          fechaSolicitud: minsAgo(22) },
  { id: uid("ped_"), internacionId: "i4",  servicioSolicitanteId: "Telemetría",       modalidad: "ecocardio", descripcion: "Ecocardiograma transtorácico", tipoTraslado: "habitacion",        regionAnatomica: "Corazón",          conContraste: false, prioridad: "prioritario", estado: "solicitado", motivo: "Disnea de esfuerzo, evaluar FEVI.",           fechaSolicitud: minsAgo(71) },
  { id: uid("ped_"), internacionId: "i5",  servicioSolicitanteId: "Clínica médica (8vo piso A)",        modalidad: "rm",  descripcion: "RM de cerebro c/ y s/ contraste", tipoTraslado: "camilla",     regionAnatomica: "Cerebro",          conContraste: true,  prioridad: "prioritario", estado: "autorizacion_pendiente", motivo: "Cefalea persistente con foco neurológico.",   fechaSolicitud: minsAgo(95) },
  { id: uid("ped_"), internacionId: "i6",  servicioSolicitanteId: "Clínica médica (7mo piso A)", creadoPor: "u1",    modalidad: "rx",  descripcion: "Rx de tórax (F)", tipoTraslado: "habitacion",                     regionAnatomica: "Tórax",            conContraste: false, prioridad: "normal",      estado: "realizado",  motivo: "Control evolutivo de neumonía.",              fechaSolicitud: minsAgo(160) },
  { id: uid("ped_"), internacionId: "i7",  servicioSolicitanteId: "Recuperación cardiovascular",           modalidad: "tc",  descripcion: "Angiotomografía de tórax (protocolo TEP)", tipoTraslado: "asistido",         regionAnatomica: "Tórax",            conContraste: true,  prioridad: "urgente",     estado: "solicitado", motivo: "TEP",            fechaSolicitud: minsAgo(12) },
  { id: uid("ped_"), internacionId: "i8",  servicioSolicitanteId: "UTI 2 (6to piso)", modalidad: "eco", descripcion: "Eco-doppler de MMII", tipoTraslado: "habitacion",                 regionAnatomica: "Miembros inferiores", lateralidad: "bilateral", conContraste: false, prioridad: "prioritario", estado: "en_proceso", motivo: "Edema unilateral, descartar TVP.",            fechaSolicitud: minsAgo(44) },
  { id: uid("ped_"), internacionId: "i9",  servicioSolicitanteId: "Guardia",         modalidad: "eco", descripcion: "Ecografía abdominal", tipoTraslado: "ambulatorio",                 regionAnatomica: "Abdomen",          conContraste: false, prioridad: "normal",      estado: "solicitado", motivo: "Dolor en fosa ilíaca derecha.",               fechaSolicitud: minsAgo(8) },
  { id: uid("ped_"), internacionId: "i10", servicioSolicitanteId: "Clínica médica (8vo piso B)",        modalidad: "tc",  descripcion: "Tomografía de encéfalo (sin contraste)", tipoTraslado: "camilla",          regionAnatomica: "Cerebro",          conContraste: false, prioridad: "urgente",     estado: "realizado",  motivo: "ACV",          fechaSolicitud: minsAgo(190) },
  { id: uid("ped_"), internacionId: "i11", servicioSolicitanteId: "Telemetría",       modalidad: "rx",  descripcion: "Rx de tórax (F y P)", tipoTraslado: "silla",                 regionAnatomica: "Tórax",            conContraste: false, prioridad: "normal",      aislamiento: true, estado: "solicitado", motivo: "Evaluación prequirúrgica.",                   fechaSolicitud: minsAgo(33) },
  { id: uid("ped_"), internacionId: "i6",  servicioSolicitanteId: "Clínica médica (7mo piso A)", creadoPor: "u1",    modalidad: "mn",  descripcion: "Centellograma óseo corporal total", tipoTraslado: "camilla",   regionAnatomica: "Cuerpo entero",    conContraste: false, prioridad: "normal",      estado: "autorizacion_pendiente", motivo: "Búsqueda de secundarismo óseo.",  fechaSolicitud: minsAgo(120) },
];

/* ── Padrón del hospital (stand-in de la base/RIS + mapa de camas) ──────
      La carga por HC autocompleta estos datos; el médico solo agrega lo
      clínico. En el futuro esto se reemplaza por el RIS y el mapa de camas. */
const PADRON_HOSPITAL = [
  { hc: "1042318", apellido: "González",  nombre: "Marta",        dni: "28.945.110", fechaNacimiento: today(1958, 4, 12),  sexo: "F", servicio: "UCO",                         sector: "UCO",                         cama: "UCO 2", obraSocial: "OSDE" },
  { hc: "1038945", apellido: "Pereyra",   nombre: "Jorge",        dni: "20.114.876", fechaNacimiento: today(1953, 9, 3),   sexo: "M", servicio: "UTI 1 (5to piso)",            sector: "UTI 1 (5to piso)",            cama: "UTI1 3", obraSocial: "PAMI" },
  { hc: "1095102", apellido: "Fernández", nombre: "Lucía",        dni: "41.302.559", fechaNacimiento: today(2017, 6, 21),  sexo: "F", servicio: "Clínica médica (9no piso B)", sector: "Clínica médica (9no piso B)", cama: "Cama 905", obraSocial: "Swiss Medical" },
  { hc: "1051877", apellido: "Sosa",      nombre: "Roberto",      dni: "16.778.234", fechaNacimiento: today(1967, 1, 30),  sexo: "M", servicio: "Telemetría",                  sector: "Telemetría",                  cama: "Tele 4", obraSocial: "Galeno" },
  { hc: "1063340", apellido: "Díaz",      nombre: "Ana Beatriz",  dni: "33.567.901", fechaNacimiento: today(1980, 11, 8),  sexo: "F", servicio: "Clínica médica (8vo piso A)", sector: "Clínica médica (8vo piso A)", cama: "Cama 818", obraSocial: "Swiss Medical" },
  { hc: "1009921", apellido: "Ramírez",   nombre: "Héctor",       dni: "12.090.443", fechaNacimiento: today(1945, 3, 17),  sexo: "M", servicio: "Clínica médica (7mo piso A)", sector: "Clínica médica (7mo piso A)", cama: "Cama 707", obraSocial: "PAMI" },
  { hc: "1087654", apellido: "Castro",    nombre: "Sofía",        dni: "39.811.276", fechaNacimiento: today(1991, 7, 2),   sexo: "F", servicio: "Recuperación cardiovascular", sector: "Recuperación cardiovascular", cama: "RCV 1", obraSocial: "OSDE" },
  { hc: "1029013", apellido: "Ibáñez",    nombre: "Daniel",       dni: "25.443.668", fechaNacimiento: today(1964, 12, 19), sexo: "M", servicio: "UTI 2 (6to piso)",            sector: "UTI 2 (6to piso)",            cama: "UTI2 2", obraSocial: "OSECAC" },
  { hc: "1071266", apellido: "Núñez",     nombre: "Valeria",      dni: "30.225.187", fechaNacimiento: today(1996, 5, 27),  sexo: "F", servicio: "Guardia",                     sector: "Guardia",                     cama: "Guardia 2", obraSocial: "Particular" },
  { hc: "1014488", apellido: "Paz",       nombre: "Miguel Ángel", dni: "14.556.029", fechaNacimiento: today(1949, 8, 14),  sexo: "M", servicio: "Clínica médica (8vo piso B)", sector: "Clínica médica (8vo piso B)", cama: "Cama 809", obraSocial: "PAMI" },
  { hc: "1080557", apellido: "Medina",    nombre: "Carla",        dni: "37.901.554", fechaNacimiento: today(1973, 2, 9),   sexo: "F", servicio: "Telemetría",                  sector: "Telemetría",                  cama: "Tele 2", obraSocial: "IOMA" },
  /* Pacientes internados SIN estudio aún (probá cargar uno por su HC) */
  { hc: "1099001", apellido: "Ortega",    nombre: "Raúl",         dni: "18.220.115", fechaNacimiento: today(1959, 10, 5),  sexo: "M", servicio: "Quirófano 1 (3er piso)",      sector: "Quirófano 1 (3er piso)",      cama: "Q1 pre", obraSocial: "Medicus" },
  { hc: "1099002", apellido: "Vega",      nombre: "Mariana",      dni: "27.640.882", fechaNacimiento: today(1979, 3, 22),  sexo: "F", servicio: "Quirófano 2 (4to piso)",      sector: "Quirófano 2 (4to piso)",      cama: "Q2 pre", obraSocial: "OMINT" },
  { hc: "1099003", apellido: "Luna",      nombre: "Tomás",        dni: "44.115.309", fechaNacimiento: today(2019, 12, 1),  sexo: "M", servicio: "Clínica médica - TMO (9no piso A)", sector: "Clínica médica - TMO (9no piso A)", cama: "Cama 901", obraSocial: "OSDE" },
  { hc: "1099004", apellido: "Suárez",    nombre: "Elena",        dni: "11.330.774", fechaNacimiento: today(1942, 6, 18),  sexo: "F", servicio: "UCO",                         sector: "UCO",                         cama: "UCO 1", obraSocial: "PAMI" },
];
const buscarPadron = (hc) => PADRON_HOSPITAL.find((p) => p.hc === String(hc).trim());

/* ── Selector / hidratación: une Pedido + Internación + Paciente en la
      "vista plana" que la UI consume. La pantalla no sabe que los datos
      están normalizados por debajo.                                     */
function edad(fechaNacimiento) {
  const d = new Date(fechaNacimiento), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
}
function hidratar(pedido, internaciones, pacientes) {
  const internacion = internaciones.find((i) => i.id === pedido.internacionId);
  const paciente = pacientes.find((p) => p.id === internacion?.pacienteId);
  return {
    ...pedido,
    _paciente: {
      nombreCompleto: paciente ? `${paciente.apellido}, ${paciente.nombre}` : "—",
      apellido: paciente?.apellido ?? "—",
      hc: paciente?.hc ?? "—",
      dni: paciente?.documento.numero ?? "—",
      edad: paciente ? edad(paciente.fechaNacimiento) : "—",
      fechaNacimiento: paciente?.fechaNacimiento ?? null,
      obraSocial: paciente?.obraSocial ?? "—",
      cama: internacion?.ubicacion.cama ?? "—",
    },
    _servicio: internacion?.servicioId ?? pedido.servicioSolicitanteId,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   UI  (sin cambios estructurales respecto de la versión anterior)
   ═══════════════════════════════════════════════════════════════════ */

const waitMins = (ts, now) => Math.max(0, Math.floor((now - ts) / 60000));
function waitText(ts, now) {
  const m = waitMins(ts, now);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

function Badge({ className = "", children }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}

function Kpi({ Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: accent + "1a", color: accent }}><Icon size={18} /></span>
      <div>
        <div className="text-2xl font-semibold leading-none text-slate-900" style={{ fontFamily: FONT_MONO }}>{value}</div>
        <div className="mt-1 text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

/* ── QR para pacientes ambulatorios (Guardia, "por sus propios medios") ──
   Generador de QR autónomo (byte mode, ECC L, versiones 1-13). El QR codifica
   el instructivo como texto plano: el paciente lo escanea con la cámara y ve
   los datos del estudio y los pasos a seguir. (En producción: link al sistema.) */
const INSTRUCCIONES_AMBULATORIO = [
  "1) Desde Guardia, siga la cartelería hacia Diagnóstico por Imágenes.",
  "2) Tome el ascensor central hasta el 2do piso.",
  "3) Preséntese en la recepción de Imágenes mostrando este código.",
  "4) Aguarde a ser llamado por su nombre.",
]; // TODO: ajustar el recorrido real del hospital

const qrPayload = (study) => {
  const p = study._paciente;
  const lineas = [
    "PEDIDO DE ESTUDIO — IMÁGENES",
    `Paciente: ${p.nombreCompleto} (HC ${p.hc})`,
    `Estudio: ${typeMeta(study.modalidad)?.label} — ${study.descripcion}`,
    ...(study.conContraste ? ["Requiere contraste"] : []),
    `Solicitado: ${fmtFecha(study.fechaSolicitud)} ${fmtHora(study.fechaSolicitud)} hs`,
    "PASOS A SEGUIR:",
    ...INSTRUCCIONES_AMBULATORIO,
  ];
  let texto = lineas.join("\n");
  const enc = new TextEncoder();
  while (enc.encode(texto).length > 420) texto = texto.slice(0, -1); // límite de capacidad del QR (v13-L)
  return texto;
};

const qrMatrix = (text) => {
  const ECC_L = [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26];   // codewords de corrección por bloque (nivel L)
  const NBLK_L = [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4];           // cantidad de bloques (nivel L)
  const rawModules = (v) => {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) {
      const na = Math.floor(v / 7) + 2;
      r -= (25 * na - 10) * na - 55;
      if (v >= 7) r -= 36;
    }
    return r;
  };
  const dataCw = (v) => Math.floor(rawModules(v) / 8) - ECC_L[v] * NBLK_L[v];
  const bytes = Array.from(new TextEncoder().encode(text));
  let ver = 0;
  for (let v = 1; v <= 13; v++) {
    const cap = dataCw(v) * 8 - 4 - (v <= 9 ? 8 : 16);
    if (bytes.length * 8 <= cap) { ver = v; break; }
  }
  if (!ver) return null;

  // ── bitstream de datos ──
  const bits = [];
  const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4);                                  // modo byte
  put(bytes.length, ver <= 9 ? 8 : 16);       // longitud
  bytes.forEach((b) => put(b, 8));
  const capBits = dataCw(ver) * 8;
  put(0, Math.min(4, capBits - bits.length)); // terminador
  while (bits.length % 8 !== 0) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let pad = 0xec; data.length < dataCw(ver); pad ^= 0xec ^ 0x11) data.push(pad);

  // ── Reed-Solomon (GF 256, polinomio 0x11d) ──
  const gfMul = (x, y) => {
    let z = 0;
    for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
    return z;
  };
  const rsDivisor = (deg) => {
    const res = new Array(deg - 1).fill(0); res.push(1);
    let root = 1;
    for (let i = 0; i < deg; i++) {
      for (let j = 0; j < res.length; j++) {
        res[j] = gfMul(res[j], root);
        if (j + 1 < res.length) res[j] ^= res[j + 1];
      }
      root = gfMul(root, 2);
    }
    return res;
  };
  const rsRemainder = (dat, div) => {
    const res = div.map(() => 0);
    for (const b of dat) {
      const factor = b ^ res.shift();
      res.push(0);
      div.forEach((coef, i) => { res[i] ^= gfMul(coef, factor); });
    }
    return res;
  };

  // ── bloques + intercalado ──
  const nBlk = NBLK_L[ver], ecLen = ECC_L[ver];
  const raw = Math.floor(rawModules(ver) / 8);
  const nShort = nBlk - (raw % nBlk);
  const shortLen = Math.floor(raw / nBlk);
  const div = rsDivisor(ecLen);
  const blocks = [];
  for (let i = 0, k = 0; i < nBlk; i++) {
    const dat = data.slice(k, k + shortLen - ecLen + (i < nShort ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, div);
    if (i < nShort) dat.push(0); // hueco del bloque corto
    blocks.push(dat.concat(ecc));
  }
  const all = [];
  for (let i = 0; i < blocks[nBlk - 1].length; i++)
    blocks.forEach((blk, j) => { if (i !== shortLen - ecLen || j >= nShort) all.push(blk[i]); });

  // ── matriz ──
  const size = ver * 4 + 17;
  const mod = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFn = (x, y, dark) => { mod[y][x] = dark; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && x < size && y >= 0 && y < size) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        setFn(x, y, d !== 2 && d !== 4);
      }
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  if (ver >= 2) {
    const na = Math.floor(ver / 7) + 2;
    const step = Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2;
    const pos = [6];
    for (let p = size - 7; pos.length < na; p -= step) pos.splice(1, 0, p);
    for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
        setFn(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
  // info de formato (ECC L = 1, máscara 0) — colocada antes de los datos
  const getBit = (x, i) => ((x >>> i) & 1) !== 0;
  let fRem = (1 << 3) | 0;
  for (let i = 0; i < 10; i++) fRem = (fRem << 1) ^ ((fRem >>> 9) * 0x537);
  const fBits = ((((1 << 3) | 0) << 10) | fRem) ^ 0x5412;
  for (let i = 0; i <= 5; i++) setFn(8, i, getBit(fBits, i));
  setFn(8, 7, getBit(fBits, 6)); setFn(8, 8, getBit(fBits, 7)); setFn(7, 8, getBit(fBits, 8));
  for (let i = 9; i < 15; i++) setFn(14 - i, 8, getBit(fBits, i));
  for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, getBit(fBits, i));
  for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, getBit(fBits, i));
  setFn(8, size - 8, true);
  if (ver >= 7) {
    let vRem = ver;
    for (let i = 0; i < 12; i++) vRem = (vRem << 1) ^ ((vRem >>> 11) * 0x1f25);
    const vBits = (ver << 12) | vRem;
    for (let i = 0; i < 18; i++) {
      const b = getBit(vBits, i), a = size - 11 + (i % 3), c = Math.floor(i / 3);
      setFn(a, c, b); setFn(c, a, b);
    }
  }
  // colocación de datos en zigzag
  let bi = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!fn[y][x] && bi < all.length * 8) {
          mod[y][x] = getBit(all[bi >>> 3], 7 - (bi & 7));
          bi++;
        }
      }
    }
  }
  // máscara 0
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
    if (!fn[y][x] && (x + y) % 2 === 0) mod[y][x] = !mod[y][x];
  return mod;
};

function QRSvg({ matrix, size = 250 }) {
  const n = matrix.length;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++)
    if (matrix[y][x]) d += `M${x} ${y}h1v1h-1z`;
  return (
    <svg viewBox={`-4 -4 ${n + 8} ${n + 8}`} width={size} height={size} role="img" aria-label="Código QR con el instructivo del estudio">
      <rect x={-4} y={-4} width={n + 8} height={n + 8} fill="#ffffff" />
      <path d={d} fill="#0f172a" />
    </svg>
  );
}

function QrModal({ study, onClose }) {
  const payload = qrPayload(study);
  const matrix = qrMatrix(payload);
  const descargar = () => {
    const blob = new Blob(["\ufeff" + payload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `instructivo-${study._paciente.hc}.txt`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">QR para el paciente</h3>
            <p className="text-xs text-slate-500">El paciente lo escanea con la cámara del teléfono y ve el instructivo. Mostralo en pantalla o imprimilo.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {matrix ? (
          <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-3">
            <QRSvg matrix={matrix} />
          </div>
        ) : (
          <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">No se pudo generar el QR (contenido demasiado largo).</p>
        )}
        <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600" style={{ fontFamily: FONT_MONO }}>{payload}</pre>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={descargar} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"><Download size={13} /> Descargar instructivo (.txt)</button>
          <button onClick={onClose} className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800">Listo</button>
        </div>
      </div>
    </div>
  );
}


function StudyCard({ study, role, now, perms = {}, currentUser, todos = [], onAdvance, onRevert, onAuthorize, onTransfer = () => {}, onEdit = () => {}, onAvisado = () => {}, onEnOrigen = () => {}, onCancel }) {
  const [verHist, setVerHist] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const t = typeMeta(study.modalidad);
  const pr = PRIORITIES[study.prioridad];
  const st = STATUS[study.estado];
  const p = study._paciente;
  const mins = waitMins(study.fechaSolicitud, now);
  const closed = study.estado === "realizado";
  const overdue = st.active && !closed && pr.umbralRojo != null && mins > pr.umbralRojo;

  const needsTransfer = TRASLADOS[study.tipoTraslado]?.requiereTraslado;
  const hermanos = todos.filter((x) => x.internacionId === study.internacionId && x.id !== study.id && STATUS[x.estado]?.active);
  const puedeGestionar = perms.cancelar && ESTADOS_PRE_TRASLADO.includes(study.estado) && (currentUser?.rol === "admin" || currentUser?.id === study.creadoPor);
  const nextAction = () => {
    if (study.estado === "autorizacion_pendiente") return { label: "Autorizar", Icon: ShieldCheck, cls: "bg-orange-600 hover:bg-orange-700", authorize: true, perm: "autorizar" };
    if (study.estado === "solicitado") return needsTransfer
      ? { label: "Solicitar traslado", Icon: Truck, cls: "bg-cyan-600 hover:bg-cyan-700", transfer: true, perm: "iniciar" }
      : { label: "Comenzar", Icon: Play, cls: "bg-blue-600 hover:bg-blue-700", perm: "iniciar" };
    if (study.estado === "traslado_solicitado") return { label: "Comenzar", Icon: Play, cls: "bg-blue-600 hover:bg-blue-700", perm: "iniciar" };
    if (study.estado === "en_proceso") return { label: "Realizado", Icon: CheckCircle2, cls: "bg-emerald-600 hover:bg-emerald-700", perm: "finalizar", returnTransfer: needsTransfer && hermanos.length === 0 };
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
              {study.estado === "autorizacion_pendiente" && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200"><ShieldAlert size={11} /> Autorización</Badge>
              )}
              {study.estado === "traslado_solicitado" && (
                <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200"><Truck size={11} /> Traslado solicitado</Badge>
              )}
              {study.aislamiento && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300"><Lock size={11} /> Aislamiento</Badge>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500" style={{ fontFamily: FONT_MONO }}>
              <span>HC {p.hc}</span><span>DNI {p.dni}</span><span>Nac. {fmtFecha(p.fechaNacimiento)} · {p.edad} años</span><span>OS {p.obraSocial}</span>
              <span className="inline-flex items-center gap-1"><BedDouble size={12} /> {p.cama}</span>
            </div>
          </div>
          <Badge className={`${t.badge} shrink-0`}><t.Icon size={12} /> {t.short}</Badge>
        </div>

        <p className="mt-2 text-sm font-medium text-slate-800">{study.descripcion}</p>
        {study.motivo && <p className="mt-0.5 text-xs leading-snug text-slate-500">{study.motivo}</p>}
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><Truck size={12} className="text-slate-400" /> {TRASLADOS[study.tipoTraslado]?.label ?? "—"}{!needsTransfer && <span className="text-slate-400"> · sin traslado</span>}</p>
        {study.tipoTraslado === "ambulatorio" && STATUS[study.estado]?.active && (
          <button onClick={() => setQrOpen(true)} className="ml-2 inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"><QrCode size={12} /> QR para el paciente</button>
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
            <span className="inline-flex items-center gap-1 text-slate-400"><Stethoscope size={12} /> {study._servicio}</span>
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
                <a href={linkWhatsApp(study, "ida", hermanos)} target="_blank" rel="noopener noreferrer" title="Reenviar WhatsApp al ayudante" className="grid h-7 w-7 place-items-center rounded-lg border border-cyan-200 text-cyan-600 transition-colors hover:bg-cyan-50"><MessageCircle size={13} /></a>
              )}
              {na && puedeAccion && (
                na.transfer ? (
                  <a href={linkWhatsApp(study, "ida", hermanos)} target="_blank" rel="noopener noreferrer" onClick={() => onTransfer(study.id)} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-white transition-colors ${na.cls}`}>
                    <na.Icon size={12} /> {na.label}
                  </a>
                ) : na.returnTransfer ? (
                  <a href={linkWhatsApp(study, "vuelta")} target="_blank" rel="noopener noreferrer" onClick={() => onAdvance(study.id)} title="Finaliza y avisa el traslado de regreso" className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-white transition-colors ${na.cls}`}>
                    <na.Icon size={12} /> {na.label}
                  </a>
                ) : (
                  <button onClick={() => (na.authorize ? onAuthorize(study.id) : onAdvance(study.id))} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-white transition-colors ${na.cls}`}>
                    <na.Icon size={12} /> {na.label}
                  </button>
                )
              )}
              {["eco", "ecocardio"].includes(study.modalidad) && needsTransfer && perms.iniciar && (study.estado === "solicitado" || study.estado === "traslado_solicitado") && (
                study.estado === "traslado_solicitado" ? (
                  <a href={linkWhatsApp(study, "sintraslado")} target="_blank" rel="noopener noreferrer" onClick={() => onEnOrigen(study.id)} title="Hacer en la cama del paciente (portátil, sin traslado) y avisar al ayudante" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"><BedDouble size={12} /> Hacer en origen</a>
                ) : (
                  <button onClick={() => onEnOrigen(study.id)} title="Hacer en la cama del paciente (portátil, sin traslado)" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"><BedDouble size={12} /> Hacer en origen</button>
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
        {currentUser?.rol === "admin" && study.historial?.length > 0 && (
          <div className="mt-2.5 border-t border-slate-100 pt-2">
            <button onClick={() => setVerHist((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600">
              <ChevronDown size={12} className={verHist ? "rotate-180" : ""} /> Historial ({study.historial.length})
            </button>
            {verHist && (
              <ol className="mt-1.5 space-y-1">
                {study.historial.map((h, i) => {
                  const u = USUARIOS.find((x) => x.id === h.por);
                  return (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <span className="shrink-0 text-slate-400" style={{ fontFamily: FONT_MONO }}>{fmtHora(h.ts)}</span>
                      <span className="font-medium text-slate-600">{STATUS[h.estado]?.label ?? h.estado}</span>
                      <span className="truncate text-slate-400">· {u ? `${u.nombre} (${ROLES[u.rol]?.label ?? u.rol})` : "—"}</span>
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

function AddStudyModal({ open, onClose, onSubmit, onUpdate, editStudy, areaRestringida = null }) {
  const blank = {
    hc: "", modalidad: "rx", descripcion: "", prioridad: "normal", motivo: "", tipoTraslado: "silla", conContraste: false, aislamiento: false, casoRojo: "", camaGuardia: "",
    manual: { apellido: "", nombre: "", dni: "", fechaNacimiento: "", obraSocial: "", servicio: SECTORES[0], cama: "" },
  };
  const [form, setForm] = useState(blank);
  useEffect(() => {
    if (!open) return;
    if (editStudy) {
      const idx = editStudy.prioridad === "urgente"
        ? CASOS_CODIGO_ROJO.findIndex((c) => c.modalidad === editStudy.modalidad && c.estudio === editStudy.descripcion)
        : -1;
      setForm({
        hc: editStudy._paciente.hc, modalidad: editStudy.modalidad, descripcion: editStudy.descripcion,
        prioridad: editStudy.prioridad, motivo: editStudy.motivo || "", tipoTraslado: editStudy.tipoTraslado,
        conContraste: !!editStudy.conContraste, aislamiento: !!editStudy.aislamiento, casoRojo: idx >= 0 ? String(idx) : "",
        manual: { apellido: "", nombre: "", dni: "", fechaNacimiento: "", obraSocial: "", servicio: SECTORES[0], cama: "" },
      });
    } else { setForm(blank); }
  }, [open, editStudy]); // eslint-disable-line react-hooks/exhaustive-deps
  // Mantener el tipo de traslado válido según modalidad y sector del paciente.
  useEffect(() => {
    if (!open) return;
    const enc = buscarPadron(form.hc);
    const sector = enc ? enc.servicio : form.manual.servicio;
    const ops = opcionesTraslado(form.modalidad, sector);
    if (!ops.includes(form.tipoTraslado)) setForm((f) => ({ ...f, tipoTraslado: ops[0] }));
  }, [open, form.modalidad, form.hc, form.manual.servicio]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;
  const isEdit = !!editStudy;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const setM = (k) => (e) => setForm((f) => ({ ...f, manual: { ...f.manual, [k]: e.target.value } }));
  const setPrioridad = (e) => setForm((f) => e.target.value === "urgente" ? { ...f, prioridad: "urgente" } : { ...f, prioridad: e.target.value, casoRojo: "" });
  const elegirCaso = (e) => {
    const c = CASOS_CODIGO_ROJO[Number(e.target.value)];
    if (!c) return setForm((f) => ({ ...f, casoRojo: "" }));
    setForm((f) => ({ ...f, casoRojo: e.target.value, modalidad: c.modalidad, descripcion: c.estudio, motivo: c.dx, conContraste: !!c.conContraste, tipoTraslado: c.tipoTraslado ?? f.tipoTraslado }));
  };

  const hcTyped = form.hc.trim().length > 0;
  const found = hcTyped ? buscarPadron(form.hc) : null;
  const noMatch = hcTyped && !found;

  const resolved = isEdit
    ? { hc: editStudy._paciente.hc, apellido: editStudy._paciente.nombreCompleto, obraSocial: editStudy._paciente.obraSocial, servicio: editStudy._servicio, sector: editStudy._servicio, cama: editStudy._paciente.cama }
    : found
    ? { hc: found.hc, apellido: found.apellido, nombre: found.nombre, dni: found.dni, fechaNacimiento: found.fechaNacimiento, sexo: found.sexo, obraSocial: found.obraSocial, servicio: found.servicio, sector: found.sector, cama: found.servicio === "Guardia" ? (form.camaGuardia.trim() || "—") : found.cama }
    : noMatch
      ? { hc: form.hc.trim(), apellido: form.manual.apellido.trim(), nombre: form.manual.nombre.trim(), dni: form.manual.dni.trim() || "—",
          fechaNacimiento: form.manual.fechaNacimiento ? new Date(form.manual.fechaNacimiento).toISOString() : today(1990, 1, 1),
          sexo: "X", obraSocial: form.manual.obraSocial.trim() || "—", servicio: form.manual.servicio, sector: "Internación", cama: form.manual.cama.trim() || "—" }
      : null;

  const edadDe = (fn) => { const d = new Date(fn), n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--; return a; };
  const fueraDeArea = !isEdit && areaRestringida && resolved && resolved.servicio !== areaRestringida;
  const valid = resolved && resolved.apellido && form.descripcion.trim() && !fueraDeArea && !(found && found.servicio === "Guardia" && !form.camaGuardia.trim());

  const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
  const lbl = "mb-1 block text-xs font-medium text-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" style={{ animation: "fade .18s ease" }} onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl" style={{ animation: "pop .2s ease" }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{isEdit ? "Editar pedido" : "Nuevo pedido de estudio"}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>

        {isEdit && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold text-slate-900">{editStudy._paciente.nombreCompleto}</p>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600" style={{ fontFamily: FONT_MONO }}>
              <span>HC {editStudy._paciente.hc}</span><span>DNI {editStudy._paciente.dni}</span><span>Nac. {fmtFecha(editStudy._paciente.fechaNacimiento)}</span><span className="font-medium text-slate-700">Obra social: {editStudy._paciente.obraSocial}</span>
              <span className="inline-flex items-center gap-1"><BedDouble size={11} /> {editStudy._paciente.cama}</span>
              <span className="inline-flex items-center gap-1"><Stethoscope size={11} /> {editStudy._servicio}</span>
            </div>
          </div>
        )}

        {!isEdit && (<>
        {/* Paso 1: Historia clínica (clave de autocompletado) */}
        <label className={lbl}>Historia clínica (HC) *</label>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${field} pl-9`} value={form.hc} onChange={set("hc")} placeholder="Ingresá la HC del paciente" inputMode="numeric" autoFocus />
        </div>

        {/* Resultado del padrón */}
        {found && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700"><CheckCircle2 size={13} /> Paciente encontrado en el padrón</div>
            <p className="mt-1.5 font-semibold text-slate-900">{found.apellido}, {found.nombre}</p>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600" style={{ fontFamily: FONT_MONO }}>
              <span>DNI {found.dni}</span><span>Nac. {fmtFecha(found.fechaNacimiento)} · {edadDe(found.fechaNacimiento)} años</span><span>{found.sexo}</span><span className="font-medium text-slate-700">Obra social: {found.obraSocial}</span>
              <span className="inline-flex items-center gap-1"><BedDouble size={11} /> {found.servicio === "Guardia" ? "Cama a completar" : found.cama}</span>
              <span className="inline-flex items-center gap-1"><Stethoscope size={11} /> {found.servicio}</span>
            </div>
          </div>
        )}

        {found && found.servicio === "Guardia" && (
          <div className="mb-4">
            <label className={lbl}>Cama / Ubicación en guardia *</label>
            <input className={field} value={form.camaGuardia} onChange={set("camaGuardia")} placeholder="Box, camilla o ubicación en guardia" />
            <p className="mt-1 text-xs text-slate-400">En guardia la ubicación no llega desde el sistema; cargala a mano.</p>
          </div>
        )}

        {fueraDeArea && (
          <div className="mb-4 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" /> El paciente está en {resolved.servicio}, fuera de tu área actual ({areaRestringida}). Cambiá tu área en el encabezado para poder pedirle estudios.
          </div>
        )}

        {noMatch && (
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <AlertTriangle size={13} /> HC no encontrada en el padrón. Cargá los datos manualmente.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Apellido *</label><input className={field} value={form.manual.apellido} onChange={setM("apellido")} placeholder="Apellido" /></div>
              <div><label className={lbl}>Nombre</label><input className={field} value={form.manual.nombre} onChange={setM("nombre")} placeholder="Nombre" /></div>
              <div><label className={lbl}>DNI</label><input className={field} value={form.manual.dni} onChange={setM("dni")} placeholder="00.000.000" /></div>
              <div><label className={lbl}>Fecha de nacimiento</label><input type="date" className={field} value={form.manual.fechaNacimiento} onChange={setM("fechaNacimiento")} /></div>
              <div><label className={lbl}>Obra social</label><input className={field} value={form.manual.obraSocial} onChange={setM("obraSocial")} placeholder="Obra social / prepaga" /></div>
              <div><label className={lbl}>Área</label><select className={field} value={form.manual.servicio} onChange={setM("servicio")}>{SECTORES.map((x) => <option key={x}>{x}</option>)}</select></div>
              <div><label className={lbl}>Cama / Habitación</label><input className={field} value={form.manual.cama} onChange={setM("cama")} placeholder="Cama 000" /></div>
            </div>
          </div>
        )}
        </>)}

        {/* Paso 2: datos clínicos del pedido (solo con paciente resuelto) */}
        {resolved && (
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <div className="col-span-2"><label className={lbl}>Urgencia / prioridad</label><select className={field} value={form.prioridad} onChange={setPrioridad}>{Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>

            {form.prioridad === "urgente" ? (
              <>
                <div className="col-span-2 flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertTriangle size={13} /> Código rojo: inmediato y sin autorización. Elegí el caso de la lista.
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Caso código rojo *</label>
                  <select className={field} value={form.casoRojo} onChange={elegirCaso}>
                    <option value="">Seleccionar caso…</option>
                    {CASOS_CODIGO_ROJO.map((c, i) => <option key={i} value={i}>{typeMeta(c.modalidad).short} · {c.dx} → {c.estudio}</option>)}
                  </select>
                  {form.casoRojo !== "" && (
                    <p className="mt-1 text-xs text-slate-500">{typeMeta(form.modalidad)?.label}{form.conContraste ? " · con contraste" : " · sin contraste"} — {form.descripcion}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="col-span-2"><label className={lbl}>Tipo de imagen</label><select className={field} value={form.modalidad} onChange={set("modalidad")}>{IMAGE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
                {requiereAuth(form.modalidad) && (
                  <div className="col-span-2 flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                    <ShieldAlert size={13} /> Este estudio requiere autorización administrativa antes de realizarse.
                  </div>
                )}
                <div className="col-span-2"><label className={lbl}>Estudio solicitado *</label><input className={field} value={form.descripcion} onChange={set("descripcion")} placeholder="Ej.: Rx de tórax (F y P)" /></div>
                <div className="col-span-2"><label className={lbl}>Diagnóstico / pregunta clínica</label><textarea rows={2} className={field} value={form.motivo} onChange={set("motivo")} placeholder="Motivo del estudio" /></div>
                <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.conContraste} onChange={set("conContraste")} className="h-4 w-4 rounded border-slate-300" /> Requiere contraste</label>
                <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.aislamiento} onChange={set("aislamiento")} className="h-4 w-4 rounded border-slate-300" /> Paciente en aislamiento (requiere precauciones)</label>
              </>
            )}
            <div className="col-span-2">
              <label className={lbl}>Tipo de traslado</label>
              <select className={field} value={form.tipoTraslado} onChange={set("tipoTraslado")}>
                {opcionesTraslado(form.modalidad, resolved?.servicio).map((k) => <option key={k} value={k}>{TRASLADOS[k].label}</option>)}
              </select>
              {!TRASLADOS[form.tipoTraslado]?.requiereTraslado && <p className="mt-1 text-xs text-slate-400">Sin traslado por ayudante: el estudio pasa directo a realizarse.</p>}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button disabled={!valid} onClick={() => isEdit
            ? onUpdate(editStudy.id, { modalidad: form.modalidad, descripcion: form.descripcion, prioridad: form.prioridad, motivo: form.motivo, tipoTraslado: form.tipoTraslado, conContraste: form.conContraste, aislamiento: form.aislamiento })
            : onSubmit({ paciente: resolved, modalidad: form.modalidad, descripcion: form.descripcion, prioridad: form.prioridad, motivo: form.motivo, tipoTraslado: form.tipoTraslado, conContraste: form.conContraste, aislamiento: form.aislamiento })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">{isEdit ? "Guardar cambios" : "Agregar a la lista"}</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  /* Estado normalizado */
  const [pacientes, setPacientes] = useState(PACIENTES);
  const [internaciones, setInternaciones] = useState(INTERNACIONES);
  const [pedidos, setPedidos] = useState(() => PEDIDOS_SEED.map((p) => ({ ...p, historial: historialSeed(p) })));

  /* Usuario actual (sin login real: se personifica desde el selector del header) */
  const [currentUserId, setCurrentUserId] = useState("u6");
  const [sesion, setSesion] = useState(false);
  const currentUser = USUARIOS.find((u) => u.id === currentUserId) || USUARIOS[0];
  const has = (permiso) => tienePermiso(currentUser, permiso);

  /* UI */
  const [role, setRole] = useState("imaging");
  const [service, setService] = useState(SECTORES[0]);
  const [typeFilter, setTypeFilter] = useState("todos");
  const [serviceFilter, setServiceFilter] = useState("todos");
  const [query, setQuery] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [soloHabitacion, setSoloHabitacion] = useState(false);
  const [soloAutorizacion, setSoloAutorizacion] = useState(false);
  const [modal, setModal] = useState(false);
  const [editStudy, setEditStudy] = useState(null);
  const [pantalla, setPantalla] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => { clearInterval(tick); document.head.removeChild(link); };
  }, []);

  // Cargar estado persistido (o sembrar los datos de ejemplo la primera vez).
  useEffect(() => {
    let vivo = true;
    (async () => {
      if (STORE) {
        try {
          const r = await STORE.get(STORE_KEY, true);
          const d = r && r.value ? JSON.parse(r.value) : null;
          if (vivo && d) {
            if (d.pacientes) setPacientes(d.pacientes);
            if (d.internaciones) setInternaciones(d.internaciones);
            if (d.pedidos) setPedidos(d.pedidos);
          }
        } catch (e) { /* primera vez / sin datos: quedan los seeds */ }
      }
      if (vivo) setCargado(true);
    })();
    return () => { vivo = false; };
  }, []);

  // Guardar ante cualquier cambio del modelo (una vez cargado).
  useEffect(() => {
    if (!cargado || !STORE) return;
    STORE.set(STORE_KEY, JSON.stringify({ pacientes, internaciones, pedidos }), true).catch(() => {});
  }, [pacientes, internaciones, pedidos, cargado]);

  /* Al cambiar de usuario: si la vista actual no está permitida, saltar a la primera permitida.
     El médico queda fijado a la lista de su servicio. */
  useEffect(() => {
    const permitidas = vistasPermitidas(currentUser);
    if (permitidas.length && !permitidas.includes(role)) setRole(permitidas[0]);
    if (currentUser.rol === "medico" && currentUser.servicio) setService(currentUser.servicio);
  }, [currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const studies = useMemo(() => pedidos.map((p) => hidratar(p, internaciones, pacientes)), [pedidos, internaciones, pacientes]);

  /* Permisos de acción que se pasan a las tarjetas */
  const perms = {
    autorizar: has("autorizar"),
    iniciar: has("iniciar"),
    finalizar: has("finalizar"),
    retroceder: has("retroceder"),
    cancelar: has("cancelar_pedido"),
  };
  /* Alcance del técnico por sectores ([] o ausente = todos) */
  const scope = null; // el personal de imágenes accede a todas las modalidades (sin restricción por sector)

  // Registra cada cambio de estado en el historial del pedido (quién + cuándo).
  const conEvento = (p, estado) => ({ ...p, estado, historial: [...(p.historial || []), { estado, ts: Date.now(), por: currentUserId }] });
  const FORWARD = { solicitado: "en_proceso", traslado_solicitado: "en_proceso", en_proceso: "realizado" };
  const advance = (id) => setPedidos((ps) => ps.map((p) => {
    if (p.id !== id) return p;
    const next = FORWARD[p.estado];
    return next ? conEvento(p, next) : p;
  }));
  // Imágenes solicita el traslado del paciente al ayudante (→ "traslado solicitado").
  const solicitarTraslado = (id) => setPedidos((ps) => ps.map((p) => p.id === id && p.estado === "solicitado" ? conEvento(p, "traslado_solicitado") : p));
  // Autorización administrativa: deja pasar el estudio a la cola operativa.
  // (Placeholder del rol administrativo; el circuito real se define luego.)
  const authorize = (id) => setPedidos((ps) => ps.map((p) => p.id === id && p.estado === "autorizacion_pendiente" ? conEvento(p, "solicitado") : p));
  const revert = (id) => setPedidos((ps) => ps.map((p) => {
    if (p.id !== id) return p;
    const needsT = TRASLADOS[p.tipoTraslado]?.requiereTraslado;
    const back = { traslado_solicitado: "solicitado", en_proceso: needsT ? "traslado_solicitado" : "solicitado", realizado: "en_proceso" };
    return back[p.estado] ? conEvento(p, back[p.estado]) : p;
  }));
  const cancel = (id) => setPedidos((ps) => ps.map((p) => p.id === id ? { ...conEvento(p, "cancelado"), avisoPendiente: null } : p));

  const addStudy = ({ paciente: pac, modalidad, descripcion, prioridad, motivo, tipoTraslado, conContraste, aislamiento }) => {
    let pid, iid;
    const existente = pacientes.find((p) => p.hc && p.hc === pac.hc); // mismo paciente → no se duplica
    if (existente) {
      pid = existente.id;
      const intern = internaciones.find((i) => i.pacienteId === pid && i.estado === "activa");
      if (intern) {
        iid = intern.id;
      } else {
        iid = uid("i_");
        setInternaciones((xs) => [...xs, { id: iid, pacienteId: pid, servicioId: pac.servicio, ubicacion: { sector: pac.sector, habitacion: "—", cama: pac.cama }, fechaIngreso: Date.now(), fechaAlta: null, estado: "activa" }]);
      }
    } else {
      pid = uid("p_"); iid = uid("i_");
      setPacientes((xs) => [...xs, { id: pid, hc: pac.hc, documento: { tipo: "DNI", numero: pac.dni }, apellido: pac.apellido, nombre: pac.nombre, fechaNacimiento: pac.fechaNacimiento, sexo: pac.sexo, obraSocial: pac.obraSocial ?? "—" }]);
      setInternaciones((xs) => [...xs, { id: iid, pacienteId: pid, servicioId: pac.servicio, ubicacion: { sector: pac.sector, habitacion: "—", cama: pac.cama }, fechaIngreso: Date.now(), fechaAlta: null, estado: "activa" }]);
    }
    const estadoIni = (requiereAuth(modalidad) && prioridad !== "urgente") ? "autorizacion_pendiente" : "solicitado";
    const ahora = Date.now();
    setPedidos((xs) => [{
      id: uid("ped_"), internacionId: iid, servicioSolicitanteId: pac.servicio, creadoPor: currentUserId,
      modalidad, descripcion: descripcion.trim(), conContraste, aislamiento, prioridad,
      motivo: motivo.trim(), tipoTraslado,
      estado: estadoIni, fechaSolicitud: ahora,
      historial: [{ estado: estadoIni, ts: ahora, por: currentUserId }],
    }, ...xs]);
    setModal(false);
  };

  const abrirEdicion = (study) => { setEditStudy(study); setModal(true); };
  const cerrarModal = () => { setModal(false); setEditStudy(null); };
  const updateStudy = (id, d) => {
    setPedidos((ps) => ps.map((p) => {
      if (p.id !== id) return p;
      let estado = p.estado, avisoPendiente = p.avisoPendiente ?? null;
      const ahoraAuth = requiereAuth(d.modalidad) && d.prioridad !== "urgente";
      // Recalcular autorización en cualquier estado previo al proceso (p. ej. bajar la prioridad de un código rojo de TC/RM/MN).
      if (["autorizacion_pendiente", "solicitado", "traslado_solicitado"].includes(estado)) {
        if (ahoraAuth && estado !== "autorizacion_pendiente") {
          if (estado === "traslado_solicitado") avisoPendiente = "sintraslado"; // había traslado pedido: avisar que no se traslade
          estado = "autorizacion_pendiente";
        } else if (!ahoraAuth && estado === "autorizacion_pendiente") {
          estado = "solicitado"; // ya no requiere autorización
        }
      }
      // Edición sobre un traslado que sigue vigente: avisar al ayudante según el cambio.
      if (p.estado === "traslado_solicitado" && estado === "traslado_solicitado" && p.tipoTraslado !== d.tipoTraslado) {
        if (!TRASLADOS[d.tipoTraslado]?.requiereTraslado) { estado = "solicitado"; avisoPendiente = "sintraslado"; }
        else { avisoPendiente = "modif"; }
      }
      const hist = estado !== p.estado ? [...(p.historial || []), { estado, ts: Date.now(), por: currentUserId }] : p.historial;
      return { ...p, modalidad: d.modalidad, descripcion: d.descripcion.trim(), prioridad: d.prioridad, motivo: d.motivo.trim(), tipoTraslado: d.tipoTraslado, conContraste: d.conContraste, aislamiento: d.aislamiento, estado, avisoPendiente, historial: hist };
    }));
    setModal(false); setEditStudy(null);
  };
  // Eco/ecocardio portátil resuelto en la cama del paciente: se puentea el traslado.
  const hacerEnOrigen = (id) => setPedidos((ps) => ps.map((p) => {
    if (p.id !== id) return p;
    const estado = "solicitado";
    const hist = estado !== p.estado ? [...(p.historial || []), { estado, ts: Date.now(), por: currentUserId }] : p.historial;
    return { ...p, tipoTraslado: "habitacion", estado, historial: hist };
  }));
  const avisado = (id) => setPedidos((ps) => ps.map((p) => p.id === id ? { ...p, avisoPendiente: null } : p));
  const reiniciar = async () => {
    if (STORE) { try { await STORE.delete(STORE_KEY, true); } catch (e) {} }
    setPacientes(PACIENTES);
    setInternaciones(INTERNACIONES);
    setPedidos(PEDIDOS_SEED.map((p) => ({ ...p, historial: historialSeed(p) })));
  };

  const isClosed = (s) => s.estado === "realizado";
  const sortFn = (a, b) => {
    const ca = isClosed(a) || a.estado === "cancelado" ? 1 : 0;
    const cb = isClosed(b) || b.estado === "cancelado" ? 1 : 0;
    if (ca !== cb) return ca - cb;
    if (PRIORITIES[a.prioridad].rank !== PRIORITIES[b.prioridad].rank) return PRIORITIES[a.prioridad].rank - PRIORITIES[b.prioridad].rank;
    return a.fechaSolicitud - b.fechaSolicitud;
  };

  const kpis = useMemo(() => ({
    auth: studies.filter((s) => s.estado === "autorizacion_pendiente").length,
    pend: studies.filter((s) => s.estado === "solicitado").length,
    proc: studies.filter((s) => s.estado === "en_proceso").length,
    urg:  studies.filter((s) => !isClosed(s) && s.estado !== "cancelado" && s.prioridad === "urgente").length,
    done: studies.filter((s) => isClosed(s)).length,
  }), [studies]);

  const matchesQuery = (s) => {
    const q = query.trim().toLowerCase();
    return !q || s._paciente.nombreCompleto.toLowerCase().includes(q) || String(s._paciente.dni).includes(q) || String(s._paciente.hc).includes(q);
  };

  const imagingList = useMemo(() => studies
    .filter(matchesQuery)
    .filter((s) => !scope || scope.includes(s.modalidad))
    .filter((s) => typeFilter === "todos" || s.modalidad === typeFilter)
    .filter((s) => serviceFilter === "todos" || s._servicio === serviceFilter)
    .filter((s) => (showDone || !isClosed(s)) && s.estado !== "cancelado")
    .filter((s) => !soloHabitacion || s.tipoTraslado === "habitacion")
    .filter((s) => !soloAutorizacion || s.estado === "autorizacion_pendiente")
    .sort(sortFn), [studies, typeFilter, serviceFilter, query, showDone, scope, soloHabitacion, soloAutorizacion]);

  const groups = useMemo(() => {
    let order = typeFilter === "todos" ? IMAGE_TYPES.map((t) => t.id) : [typeFilter];
    if (scope) order = order.filter((id) => scope.includes(id));
    return order.map((id) => ({ type: typeMeta(id), items: imagingList.filter((s) => s.modalidad === id) })).filter((g) => g.items.length);
  }, [imagingList, typeFilter, scope]);

  const myStudies = useMemo(() => studies.filter((s) => s._servicio === service && matchesQuery(s)).sort(sortFn), [studies, service, query]);
  const myBy = (estados) => myStudies.filter((s) => estados.includes(s.estado));

  const seg = (active) => `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`;

  if (!cargado) return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-400" style={{ fontFamily: FONT_SANS }}>Cargando…</div>;
  if (!sesion) return <LoginScreen onLogin={(id) => { setCurrentUserId(id); setSesion(true); }} />;

  return (
    <div style={{ fontFamily: FONT_SANS }} className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`@keyframes fade{from{opacity:0}to{opacity:1}}@keyframes pop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}@keyframes up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-white"><Hospital size={18} /></span>
            <div className="leading-tight"><div className="font-semibold">Imágenes</div><div className="text-xs text-slate-500">Circuito de estudios · Internación</div></div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-slate-200/70 p-1">
              {has("ver_imagenes") && <button className={seg(role === "imaging")} onClick={() => setRole("imaging")}><Activity size={15} /> Imágenes</button>}
              {has("ver_servicio") && <button className={seg(role === "clinical")} onClick={() => setRole("clinical")}><Stethoscope size={15} /> Área</button>}
              {has("gestionar_usuarios") && <button className={seg(role === "users")} onClick={() => setRole("users")}><Users size={15} /> Usuarios</button>}
              {currentUser.rol === "admin" && <button className={seg(role === "dashboard")} onClick={() => setRole("dashboard")}><BarChart3 size={15} /> Dashboard</button>}
            </div>
            {has("ver_imagenes") && <button onClick={() => setPantalla(true)} title="Modo pantalla (tablero)" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"><Monitor size={15} /> Pantalla</button>}
            {role === "clinical" && (
              <div className="relative" title={currentUser.rol === "medico" ? "Área en la que estás trabajando" : "Área"}>
                {currentUser.rol === "medico" && <Stethoscope size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />}
                <select value={service} onChange={(e) => setService(e.target.value)} className={`appearance-none rounded-lg border border-slate-200 bg-white py-2 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 ${currentUser.rol === "medico" ? "pl-8" : "pl-3"}`}>{SECTORES.map((s) => <option key={s}>{s}</option>)}</select>
                <ChevronDown size={15} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            )}
            {/* Selector de usuario (placeholder de login: personifica un rol) */}
            <div className="relative">
              <UserCircle size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: ROLES[currentUser.rol].color }} />
              <select value={currentUserId} onChange={(e) => setCurrentUserId(e.target.value)} className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-blue-400">
                {USUARIOS.map((u) => <option key={u.id} value={u.id}>{u.nombre} · {ROLES[u.rol].label}</option>)}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <button onClick={() => setSesion(false)} title="Cerrar sesión" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><LogOut size={15} /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        {role === "imaging" && (
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Kpi Icon={ShieldAlert}   label="Autorización pend." value={kpis.auth} accent="#ea580c" />
            <Kpi Icon={ListChecks}    label="Pendientes"        value={kpis.pend} accent="#475569" />
            <Kpi Icon={AlertTriangle} label="Código rojo activos" value={kpis.urg}  accent="#dc2626" />
            <Kpi Icon={Play}          label="En proceso"        value={kpis.proc} accent="#2563eb" />
            <Kpi Icon={CheckCircle2}  label="Realizados"        value={kpis.done} accent="#059669" />
          </div>
        )}

        {role !== "users" && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="relative grow basis-56">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por paciente, DNI o HC…" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </div>

          {role === "imaging" ? (
            <>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                <button onClick={() => setTypeFilter("todos")} className={`rounded-md px-2.5 py-1 text-xs font-medium ${typeFilter === "todos" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>Todos</button>
                {IMAGE_TYPES.map((t) => (
                  <button key={t.id} onClick={() => setTypeFilter(t.id)} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${typeFilter === t.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}><t.Icon size={12} /> {t.short}</button>
                ))}
              </div>
              <div className="relative">
                <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-600 outline-none focus:border-blue-400">
                  <option value="todos">Todas las áreas</option>
                  {SECTORES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <button onClick={() => setShowDone((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"><Filter size={13} /> {showDone ? "Ocultar finalizados" : "Ver finalizados"}</button>
              <button onClick={() => setSoloHabitacion((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${soloHabitacion ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}><BedDouble size={13} /> En habitación</button>
              <button onClick={() => setSoloAutorizacion((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${soloAutorizacion ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600"}`}><ShieldAlert size={13} /> Autorización pendiente</button>
            </>
          ) : role === "clinical" && has("pedir_estudio") ? (
            <button onClick={() => { setEditStudy(null); setModal(true); }} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"><Plus size={16} /> Nuevo estudio</button>
          ) : null}
        </div>
        )}

        {role === "dashboard" ? (
          <DashboardView studies={studies} />
        ) : role === "users" ? (
          <UsersPanel currentUser={currentUser} onReset={reiniciar} />
        ) : role === "imaging" ? (
          groups.length === 0 ? <EmptyState text="No hay estudios que coincidan con el filtro." /> : (
            <div className="space-y-6">
              {groups.map((g) => (
                <section key={g.type.id}>
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className={`grid h-7 w-7 place-items-center rounded-lg border ${g.type.badge}`}><g.type.Icon size={15} /></span>
                    <h3 className="text-sm font-semibold text-slate-700">{g.type.label}</h3>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600" style={{ fontFamily: FONT_MONO }}>{g.items.length}</span>
                  </div>
                  {(() => {
                    const rojos = g.items.filter((s) => alertaDemora(s, now) === "urgente").length;
                    const prio  = g.items.filter((s) => alertaDemora(s, now) === "prioritario").length;
                    if (!rojos && !prio) return null;
                    return (
                      <div className={`mb-2.5 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${rojos ? "border-red-300 bg-red-50 text-red-700" : "border-amber-300 bg-amber-50 text-amber-700"}`}>
                        <AlertTriangle size={14} />
                        {rojos > 0 && <span>{rojos} código rojo sin atender (+30 min)</span>}
                        {rojos > 0 && prio > 0 && <span aria-hidden>·</span>}
                        {prio > 0 && <span>{prio} prioridad demorada (+2 h)</span>}
                      </div>
                    );
                  })()}
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    {g.items.map((s) => <div key={s.id} style={{ animation: "up .25s ease both" }}><StudyCard study={s} role={role} now={now} perms={perms} onAdvance={advance} onRevert={revert} currentUser={currentUser} todos={studies} onAuthorize={authorize} onTransfer={solicitarTraslado} onEnOrigen={hacerEnOrigen} /></div>)}
                  </div>
                </section>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-6">
            <ClinicalSection title="Autorización pendiente" items={myBy(["autorizacion_pendiente"])} {...{ role, now, perms, currentUser, todos: studies, advance, revert, authorize, onEdit: abrirEdicion, onAvisado: avisado, cancel }} />
            <ClinicalSection title="Pendientes" items={myBy(["solicitado", "programado", "traslado_solicitado"])} {...{ role, now, perms, currentUser, todos: studies, advance, revert, authorize, onEdit: abrirEdicion, onAvisado: avisado, cancel }} />
            <ClinicalSection title="En proceso" items={myBy(["en_proceso"])} {...{ role, now, perms, currentUser, todos: studies, advance, revert, authorize, onEdit: abrirEdicion, onAvisado: avisado, cancel }} />
            <ClinicalSection title="Finalizados" items={myBy(["realizado"])} {...{ role, now, perms, currentUser, todos: studies, advance, revert, authorize, onEdit: abrirEdicion, onAvisado: avisado, cancel }} />
            {myStudies.length === 0 && <EmptyState text={`${service} no tiene estudios cargados. Agregá el primero con "Nuevo estudio".`} />}
          </div>
        )}
      </main>

      <AddStudyModal open={modal} onClose={cerrarModal} onSubmit={addStudy} onUpdate={updateStudy} editStudy={editStudy} areaRestringida={currentUser.rol === "medico" ? service : null} />
      {pantalla && <BoardView studies={studies} now={now} onExit={() => setPantalla(false)} />}
    </div>
  );
}

function ClinicalSection({ title, items, role, now, perms, currentUser, todos, advance, revert, authorize, onEdit, onAvisado, cancel }) {
  if (!items.length) return null;
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600" style={{ fontFamily: FONT_MONO }}>{items.length}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {items.map((s) => <div key={s.id} style={{ animation: "up .25s ease both" }}><StudyCard study={s} role={role} now={now} perms={perms} currentUser={currentUser} todos={todos} onAdvance={advance} onRevert={revert} onAuthorize={authorize} onEdit={onEdit} onAvisado={onAvisado} onCancel={cancel} /></div>)}
      </div>
    </section>
  );
}

function UsersPanel({ currentUser, onReset }) {
  const [confirmar, setConfirmar] = useState(false);
  const roles = Object.entries(ROLES);
  const permisos = Object.entries(PERMISOS);
  return (
    <div className="space-y-6">
      {/* Matriz de permisos por rol */}
      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700"><ShieldCheck size={15} /></span>
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
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600"><Users size={15} /></span>
          <h3 className="text-sm font-semibold text-slate-700">Usuarios</h3>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600" style={{ fontFamily: FONT_MONO }}>{USUARIOS.length}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {USUARIOS.map((u) => {
            const r = ROLES[u.rol];
            const alcance = u.servicio
              ? u.servicio
              : u.rol === "tecnico"
                ? "Todas las modalidades"
                : "—";
            return (
              <div key={u.id} className={`rounded-xl border bg-white p-3 ${u.id === currentUser.id ? "border-slate-400 ring-1 ring-slate-300" : "border-slate-200"}`}>
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: r.color + "1a", color: r.color }}><UserCircle size={20} /></span>
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
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600"><RotateCcw size={15} /></span>
          <h3 className="text-sm font-semibold text-slate-700">Datos</h3>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm text-slate-500">Los datos persisten entre recargas. Reiniciar restablece los datos de ejemplo y borra lo guardado.</p>
          {!confirmar ? (
            <button onClick={() => setConfirmar(true)} className="ml-auto shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">Reiniciar datos</button>
          ) : (
            <span className="ml-auto flex shrink-0 items-center gap-2">
              <button onClick={() => { onReset?.(); setConfirmar(false); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700">Confirmar</button>
              <button onClick={() => setConfirmar(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">Cancelar</button>
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function duracionesEtapa(study) {
  const h = study.historial || [];
  const d = {};
  for (let i = 0; i < h.length - 1; i++) d[h[i].estado] = (d[h[i].estado] || 0) + (h[i + 1].ts - h[i].ts);
  return d;
}
const fmtDur = (ms) => {
  if (ms == null || ms <= 0) return "—";
  const m = Math.round(ms / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
};
const prom = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

function DashboardView({ studies }) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
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

  const sectores = {};
  studies.forEach((s) => { sectores[s._servicio] = (sectores[s._servicio] || 0) + 1; });
  const porSector = Object.entries(sectores).map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
  const maxSec = Math.max(1, ...porSector.map((x) => x.n));

  const totalProm = prom(realizados.map((s) => { const h = s.historial || []; return h.length > 1 ? h[h.length - 1].ts - h[0].ts : 0; }).filter((v) => v > 0));

  const rojoInicio = rojos.map((s) => { const h = s.historial || []; const ini = h.find((x) => x.estado === "en_proceso"); return ini && h[0] ? ini.ts - h[0].ts : null; }).filter((v) => v != null);
  const rojoFuera = rojoInicio.filter((v) => v > 30 * 60000).length;

  const exportarCSV = () => {
    const cols = ["HC", "Paciente", "Obra social", "Área", "Modalidad", "Estudio", "Aislamiento", "Prioridad", "Solicitado", "Autorizado", "Traslado pedido", "Inicio", "Realizado", "En autorización (min)", "En espera (min)", "En traslado (min)", "En proceso (min)"];
    const min = (ms) => (ms ? Math.round(ms / 60000) : "");
    const fmt = (ts) => (ts ? new Date(ts).toLocaleString("es-AR") : "");
    const horaDe = (s, estado) => { const e = (s.historial || []).find((h) => h.estado === estado); return e ? e.ts : null; };
    const desdeTs = desde ? new Date(desde + "T00:00:00").getTime() : null;
    const hastaTs = hasta ? new Date(hasta + "T23:59:59").getTime() : null;
    const enRango = studies.filter((s) => {
      const t = new Date(s.fechaSolicitud).getTime();
      return (desdeTs == null || t >= desdeTs) && (hastaTs == null || t <= hastaTs);
    });
    const filas = enRango.map((s) => {
      const d = duracionesEtapa(s);
      const autorizado = s.historial?.[0]?.estado === "autorizacion_pendiente" ? horaDe(s, "solicitado") : null;
      return [s._paciente.hc, s._paciente.nombreCompleto, s._paciente.obraSocial, s._servicio, typeMeta(s.modalidad)?.label, s.descripcion, s.aislamiento ? "Sí" : "No", PRIORITIES[s.prioridad]?.label, fmt(s.fechaSolicitud), fmt(autorizado), fmt(horaDe(s, "traslado_solicitado")), fmt(horaDe(s, "en_proceso")), fmt(horaDe(s, "realizado")), min(d.autorizacion_pendiente), min(d.solicitado), min(d.traslado_solicitado), min(d.en_proceso)];
    });
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols, ...filas].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "imagenes-export.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const KPI = ({ label, value, sub }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
  const Barra = ({ label, n, max, texto, color = "#0f172a" }) => (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-36 shrink-0 truncate text-slate-600">{label}</span>
      <div className="h-2.5 flex-1 rounded-full bg-slate-100"><div className="h-2.5 rounded-full" style={{ width: `${(n / max) * 100}%`, background: color }} /></div>
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
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-slate-500">Desde <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400" /></label>
          <label className="flex items-center gap-1 text-xs text-slate-500">Hasta <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400" /></label>
          {(desde || hasta) && <button onClick={() => { setDesde(""); setHasta(""); }} className="text-xs text-slate-400 underline">limpiar</button>}
          <button onClick={exportarCSV} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"><BarChart3 size={15} /> Exportar CSV</button>
        </div>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Volumen por modalidad</h3>
          <div className="space-y-2.5">
            {porModalidad.length === 0 ? <p className="text-sm text-slate-400">Sin datos.</p> : porModalidad.map((m) => <Barra key={m.label} label={m.label} n={m.n} max={maxMod} />)}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Volumen por área solicitante</h3>
          <div className="space-y-2.5">
            {porSector.map((m) => <Barra key={m.label} label={m.label} n={m.n} max={maxSec} color="#8b5cf6" />)}
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

function LoginScreen({ onLogin }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 px-4" style={{ fontFamily: FONT_SANS }}>
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 text-white"><Hospital size={28} /></span>
          <h1 className="mt-3 text-xl font-bold text-slate-900">Imágenes — Worklist</h1>
          <p className="text-sm text-slate-500">Circuito de estudios por imágenes de internación</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <button onClick={() => onLogin("u6")} className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"><Lock size={15} /> Iniciar sesión con el sistema del hospital</button>
          <p className="mt-2 text-center text-xs text-slate-400">Inicio de sesión simulado. La integración con la identidad del hospital se hace en el backend.</p>
          <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" /> modo demostración <span className="h-px flex-1 bg-slate-200" /></div>
          <p className="mb-2 text-xs font-medium text-slate-500">Entrar como:</p>
          <div className="grid gap-2">
            {USUARIOS.map((u) => {
              const r = ROLES[u.rol];
              return (
                <button key={u.id} onClick={() => onLogin(u.id)} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: r.color + "1a", color: r.color }}><UserCircle size={20} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{u.nombre}</span>
                    <span className="block text-xs font-medium" style={{ color: r.color }}>{r.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 bg-white/50 px-6 py-16 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400"><Activity size={22} /></div>
      <p className="max-w-xs text-sm text-slate-500">{text}</p>
    </div>
  );
}
