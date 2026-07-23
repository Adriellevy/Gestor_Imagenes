import { IMAGE_TYPES, STATUS, PRIORITIES, TRASLADOS, MODALIDADES_PORTATIL } from './constants';
import type { Pedido, Paciente, Internacion } from '../types';

export const typeMeta = (id: string) => IMAGE_TYPES.find((t) => t.id === id);
export const requiereAuth = (modalidad: string) => Boolean(typeMeta(modalidad)?.requiereAutorizacion);

export const waitMins = (ts: number, now: number) => Math.max(0, Math.floor((now - ts) / 60000));

export function waitText(ts: number, now: number) {
  const m = waitMins(ts, now);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function alertaDemora(study: Pedido, now: number) {
  const pr = PRIORITIES[study.prioridad];
  if (!STATUS[study.estado]?.active || pr.umbralAlerta == null) return null;
  return waitMins(study.fechaSolicitud, now) > pr.umbralAlerta ? study.prioridad : null;
}

export const opcionesTraslado = (modalidad: string, sector: string) => {
  const ops = ["silla", "camilla", "asistido"];
  if (MODALIDADES_PORTATIL.includes(modalidad)) ops.push("habitacion");
  if (sector === "Guardia") ops.push("ambulatorio");
  return ops;
};

const NUMERO_TRASLADOS = "5491100000000";
export function mensajeTraslado(study: any, tipo = "ida", hermanos: any[] = []) {
  const imagenes = typeMeta(study.modalidad)?.label ?? "Imágenes";
  const ubic = `${study._servicio} - ${study._paciente?.cama}`;
  const tr = TRASLADOS[study.tipoTraslado]?.label ?? "—";
  const paciente = `Paciente: ${study._paciente?.nombreCompleto} (HC ${study._paciente?.hc})`;
  const vuelta = tipo === "vuelta";

  let origen = ubic;
  let destino = imagenes;
  let titulo = "Solicitud de traslado";
  
  if (vuelta) {
    origen = imagenes;
    if (hermanos && hermanos.length > 0) {
      destino = typeMeta(hermanos[0].modalidad)?.label ?? "Imágenes";
      titulo = "Solicitud de traslado (a siguiente estudio)";
    } else {
      destino = ubic;
      titulo = "Solicitud de traslado (regreso a origen)";
    }
  }

  const lineas =
    tipo === "cancel"      ? ["TRASLADO CANCELADO", paciente, `Ubicación: ${ubic}`, "Estudio suspendido."] :
    tipo === "sintraslado" ? ["TRASLADO CANCELADO", paciente, `Ubicación: ${ubic}`, "El estudio se realizará sin traslado (en cama/habitación)."] :
    tipo === "modif"       ? ["TRASLADO MODIFICADO", paciente, `Ubicación: ${ubic}`, `Nuevo medio: ${tr}`] :
    [
      titulo,
      paciente,
      ...(study.aislamiento ? ["AISLAMIENTO: requiere precauciones (traer EPP)."] : []),
      `Desde: ${origen}`,
      `Hacia: ${destino}`,
      `Traslado: ${tr}`,
      `Estudio: ${study.descripcion}${vuelta ? " (finalizado)" : ""}`,
      ...(!vuelta && hermanos && hermanos.length ? [`Otros estudios del paciente: ${hermanos.map((h: any) => `${typeMeta(h.modalidad)?.short || h.modalidad} ${h.descripcion}`).join("; ")}`] : []),
      ...(vuelta && hermanos && hermanos.length ? [`Siguientes estudios pendientes: ${hermanos.map((h: any) => `${typeMeta(h.modalidad)?.short || h.modalidad} ${h.descripcion}`).join("; ")}`] : []),
      `Prioridad: ${PRIORITIES[study.prioridad]?.label}`,
    ];
  const cuerpo = lineas.join("\n");
  return study.prioridad === "urgente" ? `🔴 CÓDIGO ROJO - URGENCIA\n\n${cuerpo}` : cuerpo;
}
export const linkWhatsApp = (study: any, tipo = "ida", hermanos: any[] = []) => `https://wa.me/${NUMERO_TRASLADOS}?text=${encodeURIComponent(mensajeTraslado(study, tipo, hermanos))}`;

export const fmtHora = (ts: number) => new Date(ts).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

export function edad(fechaNacimiento: string) {
  const d = new Date(fechaNacimiento), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
}

let _emergAudioCtx: AudioContext | null = null;
export function beepEmergencia() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!_emergAudioCtx) {
      _emergAudioCtx = new AudioCtx();
    }
    const ctx = _emergAudioCtx;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const t0 = ctx.currentTime;
    [[0, 880], [0.28, 880], [0.56, 1245]].forEach(([dt, f]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t = t0 + dt;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.start(t);
      o.stop(t + 0.22);
    });
  } catch {
    // el navegador puede bloquear el audio hasta una interacción del usuario
  }
}

export function hidratar(pedido: Pedido, internaciones: Internacion[], pacientes: Paciente[]): Pedido {
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
      cama: internacion?.ubicacion.cama ?? "—",
      obraSocial: paciente?.obraSocial,
      fechaNacimiento: paciente?.fechaNacimiento ?? null,
    },
    _servicio: internacion?.servicioId ?? pedido.servicioSolicitanteId,
  };
}
