export interface Documento {
  tipo: string;
  numero: string;
}

export interface Paciente {
  id: string;
  hc: string;
  documento: Documento;
  apellido: string;
  nombre: string;
  fechaNacimiento: string;
  sexo: string;
  obraSocial?: string;
}

export interface Ubicacion {
  sector: string;
  habitacion: string;
  cama: string;
}

export interface Internacion {
  id: string;
  pacienteId: string;
  servicioId: string;
  ubicacion: Ubicacion;
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

export interface Pedido {
  id: string;
  internacionId: string;
  servicioSolicitanteId: string;
  creadoPor?: string;
  modalidad: string;
  descripcion: string;
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
  // Propiedades hidratadas por el store
  _paciente?: {
    nombreCompleto: string;
    apellido: string;
    hc: string;
    dni: string;
    edad: number | string;
    cama: string;
    obraSocial?: string;
  };
  _servicio?: string;
}
