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
export function mensajeTraslado(study: any, tipo = "ida", hermanos?: any[]) {
  const imagenes = typeMeta(study.modalidad)?.label ?? "Imágenes";
  const ubic = `${study._servicio} - ${study._paciente?.cama}`;
  const tr = TRASLADOS[study.tipoTraslado]?.label ?? "—";
  const paciente = `Paciente: ${study._paciente?.nombreCompleto} (HC ${study._paciente?.hc})`;
  const vuelta = tipo === "vuelta";
  
  let estText = `Estudio: ${study.descripcion}`;
  if (hermanos && hermanos.length > 0) {
    const todos = [study, ...hermanos];
    estText = `Estudios (${todos.length}): ${todos.map(s => s.descripcion).join(", ")}`;
  }
  
  const lineas =
    tipo === "cancel" ? ["TRASLADO CANCELADO", paciente, `Ubicación: ${ubic}`, "Estudio suspendido."] :
    tipo === "sintraslado" ? ["TRASLADO CANCELADO", paciente, `Ubicación: ${ubic}`, "El estudio se realizará sin traslado."] :
    tipo === "modif" ? ["TRASLADO MODIFICADO", paciente, `Ubicación: ${ubic}`, `Nuevo medio: ${tr}`] :
    [
      vuelta ? "Solicitud de traslado (regreso a origen)" : "Solicitud de traslado",
      paciente,
      ...(vuelta ? [`Desde: ${imagenes}`, `Hacia: ${ubic}`] : [`Origen: ${ubic}`, `Destino: ${imagenes}`]),
      `Traslado: ${tr}`,
      estText + (vuelta ? " (finalizados)" : ""),
      `Prioridad: ${PRIORITIES[study.prioridad]?.label}`,
    ];
  return lineas.join("\n");
}
export const linkWhatsApp = (study: any, tipo = "ida", hermanos?: any[]) => `https://wa.me/${NUMERO_TRASLADOS}?text=${encodeURIComponent(mensajeTraslado(study, tipo, hermanos))}`;

export const fmtHora = (ts: number) => new Date(ts).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

export function edad(fechaNacimiento: string) {
  const d = new Date(fechaNacimiento), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
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
    },
    _servicio: internacion?.servicioId ?? pedido.servicioSolicitanteId,
  };
}
