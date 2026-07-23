import { Bone, Scan, Brain, Waves, HeartPulse, Radiation } from 'lucide-react';

export const IMAGE_TYPES = [
  { id: "rx", label: "Radiología", short: "Rx", dicom: "CR/DX", requiereAutorizacion: false, Icon: Bone, badge: "bg-sky-50 text-sky-700 border-sky-200" },
  { id: "tc", label: "Tomografía", short: "TC", dicom: "CT", requiereAutorizacion: true, Icon: Scan, badge: "bg-violet-50 text-violet-700 border-violet-200" },
  { id: "rm", label: "Resonancia", short: "RM", dicom: "MR", requiereAutorizacion: true, Icon: Brain, badge: "bg-teal-50 text-teal-700 border-teal-200" },
  { id: "eco", label: "Ecografía", short: "Eco", dicom: "US", requiereAutorizacion: false, Icon: Waves, badge: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "ecocardio", label: "Ecocardiografía", short: "EcoC", dicom: "US", requiereAutorizacion: false, Icon: HeartPulse, badge: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "mn", label: "Medicina nuclear", short: "MN", dicom: "NM", requiereAutorizacion: true, Icon: Radiation, badge: "bg-lime-50 text-lime-700 border-lime-200" },
];

export const PERMISOS = {
  pedir_estudio: "Solicitar estudios",
  cancelar_pedido: "Cancelar pedidos",
  autorizar: "Autorización administrativa",
  iniciar: "Iniciar / dar ingreso",
  finalizar: "Finalizar (realizado)",
  retroceder: "Retroceder estado",
  ver_imagenes: "Ver worklist de imágenes",
  ver_servicio: "Ver lista del servicio",
  gestionar_usuarios: "Gestionar usuarios",
};

export const ROLES = {
  medico: { label: "Médico solicitante", color: "#2563eb", permisos: ["pedir_estudio", "cancelar_pedido", "ver_servicio", "ver_imagenes"] },
  tecnico: { label: "Personal de imágenes", color: "#0d9488", permisos: ["iniciar", "finalizar", "retroceder", "ver_imagenes"] },
  administrativo: { label: "Administrativo", color: "#ea580c", permisos: ["autorizar", "ver_imagenes"] },
  admin: { label: "Admin general", color: "#7c3aed", permisos: Object.keys(PERMISOS) },
};

export const SECTORES = [
  "Guardia", "UCO", "Recuperación cardiovascular", "Telemetría",
  "Quirófano 1 (3er piso)", "Quirófano 2 (4to piso)",
  "UTI 1 (5to piso)", "UTI 2 (6to piso)",
  "Clínica médica (7mo piso A)", "Clínica médica (7mo piso B)",
  "Clínica médica (8vo piso A)", "Clínica médica (8vo piso B)",
  "Clínica médica - TMO (9no piso A)", "Clínica médica (9no piso B)",
  "Internación ambulatoria",
];

export const PRIORITIES: Record<string, any> = {
  urgente: { label: "Urgente - código rojo", short: "Código rojo", badge: "bg-red-50 text-red-700 border-red-200", bar: "#dc2626", rank: 0, umbralRojo: 30, umbralAlerta: 10 },
  prioritario: { label: "Prioridad", short: "Prioridad", badge: "bg-amber-50 text-amber-700 border-amber-200", bar: "#d97706", rank: 1, umbralRojo: 120, umbralAlerta: 120 },
  normal: { label: "En internación", short: "En internación", badge: "bg-slate-100 text-slate-600 border-slate-200", bar: "#cbd5e1", rank: 2, umbralRojo: null, umbralAlerta: null },
};

export const CASOS_CODIGO_ROJO = [
  { modalidad: "tc", dx: "TEP", estudio: "Angiotomografía de tórax (protocolo TEP)", conContraste: true },
  { modalidad: "tc", dx: "Síndrome aórtico", estudio: "Angiotomografía de aorta", conContraste: true },
  { modalidad: "tc", dx: "ACV", estudio: "Angiotomografía de encéfalo (vasos intra y extracraneanos)", conContraste: true },
  { modalidad: "rm", dx: "ACV", estudio: "RMN de encéfalo (protocolo stroke)", conContraste: false },
  { modalidad: "rx", dx: "Neumotórax", estudio: "Rx de tórax", conContraste: false, tipoTraslado: "habitacion" },
  { modalidad: "ecocardio", dx: "Sospecha de taponamiento", estudio: "Ecocardiograma de urgencia (descartar taponamiento)", conContraste: false, tipoTraslado: "habitacion" },
];

export const STATUS: Record<string, any> = {
  autorizacion_pendiente: { label: "Autorización pendiente", badge: "bg-orange-100 text-orange-700", rank: -1, active: true },
  solicitado: { label: "Pendiente", badge: "bg-slate-100 text-slate-600", rank: 0, active: true },
  traslado_solicitado: { label: "Traslado solicitado", badge: "bg-cyan-50 text-cyan-700", rank: 1, active: true },
  en_proceso: { label: "En proceso", badge: "bg-blue-50 text-blue-700", rank: 2, active: true },
  traslado_retorno: { label: "Traslado post-estudio", badge: "bg-cyan-50 text-cyan-700", rank: 2.5, active: true },
  realizado: { label: "Realizado", badge: "bg-emerald-50 text-emerald-700", rank: 3, active: false },
  cancelado: { label: "Cancelado", badge: "bg-rose-50 text-rose-700", rank: 9, active: false },
};

export const TRASLADOS: Record<string, any> = {
  silla: { label: "Silla de ruedas", requiereTraslado: true },
  camilla: { label: "Camilla", requiereTraslado: true },
  asistido: { label: "Traslado asistido", requiereTraslado: true },
  habitacion: { label: "En habitación", requiereTraslado: false },
  ambulatorio: { label: "Por sus propios medios", requiereTraslado: false },
};

export const ESTADOS_PRE_TRASLADO = ["autorizacion_pendiente", "solicitado", "traslado_solicitado"];
export const MODALIDADES_PORTATIL = ["rx", "eco", "ecocardio"];
