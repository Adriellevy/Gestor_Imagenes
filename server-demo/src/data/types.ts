export interface Paciente {
  id: string;
  hc: string;
  documento: { tipo: string; numero: string };
  apellido: string;
  nombre: string;
  fechaNacimiento: string;
  sexo: string;
  obraSocial?: string;
}

export interface Internacion {
  id: string;
  pacienteId: string;
  servicioId: string;
  ubicacion: { sector: string; habitacion: string; cama: string };
  fechaIngreso: number;
  fechaAlta: number | null;
  estado: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  rol: string;
  servicio?: string;
  sectores?: string[];
}

export interface TipoEstudio {
  id?: number;
  codigo: string;
  tipo: string;
}

export interface EstudioSolicitadoSeed {
  pedidoId: string;
  codigo: string;
  descripcion: string;
}

export interface Pedido {
  id: string;
  internacionId: string;
  servicioSolicitanteId: string;
  creadoPor?: string;
  tipoTraslado: string;
  regionAnatomica: string;
  lateralidad?: string;
  conContraste: boolean;
  prioridad: string;
  estado: string;
  motivo: string;
  fechaSolicitud: number;
  historial?: any[];
  avisoPendiente?: string;
  aislamiento?: boolean;
  ordenMedica?: {
    nombre: string;
    datos: string;
    tipo?: string;
  } | null;
  casoRojo?: string;
  camaGuardia?: string;
  emergenciaVista?: { ts: number; por: string } | null;
  modalidad?: string;
  descripcion?: string;
}
