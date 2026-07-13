import { TIPOS_ESTUDIO_SEED, USUARIOS, PACIENTES, INTERNACIONES, PEDIDOS_SEED, PADRON_HOSPITAL } from '../data/seed';
import { TipoEstudio, Usuario, Paciente, Internacion, Pedido } from '../data/types';

export class MemoryStore {
  private tiposEstudio: TipoEstudio[] = [];
  private usuarios: Usuario[] = [];
  private pacientes: Paciente[] = [];
  private internaciones: Internacion[] = [];
  private pedidos: Pedido[] = [];
  private padron: any[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.tiposEstudio = JSON.parse(JSON.stringify(TIPOS_ESTUDIO_SEED));
    this.usuarios = JSON.parse(JSON.stringify(USUARIOS));
    this.pacientes = JSON.parse(JSON.stringify(PACIENTES));
    this.internaciones = JSON.parse(JSON.stringify(INTERNACIONES));
    this.pedidos = JSON.parse(JSON.stringify(PEDIDOS_SEED));
    this.padron = JSON.parse(JSON.stringify(PADRON_HOSPITAL));
  }

  public getTiposEstudio(): TipoEstudio[] {
    return this.tiposEstudio;
  }

  public getUsuarios(): Usuario[] {
    return this.usuarios;
  }

  public findUsuarioById(id: string): Usuario | undefined {
    return this.usuarios.find(u => u.id === id);
  }

  public getPacientes(): Paciente[] {
    return this.pacientes;
  }

  public getPadron(): any[] {
    return this.padron;
  }

  public createPaciente(data: Omit<Paciente, 'id'> | Paciente): Paciente {
    const id = 'id' in data && data.id ? data.id : 'p_' + Math.random().toString(36).slice(2, 9);
    const nuevo: Paciente = { ...data, id };
    this.pacientes.push(nuevo);
    return nuevo;
  }

  public getInternaciones(): Internacion[] {
    return this.internaciones;
  }

  public createInternacion(data: Omit<Internacion, 'id'> | Internacion): Internacion {
    const id = 'id' in data && data.id ? data.id : 'int_' + Math.random().toString(36).slice(2, 9);
    const nueva: Internacion = { ...data, id };
    this.internaciones.push(nueva);
    return nueva;
  }

  public updateUbicacionInternacion(internacionId: string, cama: string, sector?: string): Internacion | null {
    const idx = this.internaciones.findIndex(i => i.id === internacionId);
    if (idx === -1) return null;
    this.internaciones[idx].ubicacion.cama = cama;
    if (sector) {
      this.internaciones[idx].ubicacion.sector = sector;
    }
    return this.internaciones[idx];
  }

  public getPedidos(): Pedido[] {
    return this.pedidos;
  }

  public getPedidosTerminados(page = 1, limit = 6): { data: Pedido[]; total: number; page: number; limit: number } {
    const terminados = this.pedidos.filter(p => p.estado === 'realizado' || p.estado === 'cancelado');
    const start = (page - 1) * limit;
    const paginated = terminados.slice(start, start + limit);
    return {
      data: paginated,
      total: terminados.length,
      page,
      limit,
    };
  }

  public createPedido(data: Partial<Pedido>): Pedido {
    const id = data.id || 'ped_' + Math.random().toString(36).slice(2, 9);
    const nuevo: Pedido = {
      id,
      internacionId: data.internacionId || '',
      servicioSolicitanteId: data.servicioSolicitanteId || '',
      creadoPor: data.creadoPor || 'u1',
      modalidad: data.modalidad || 'tc',
      descripcion: data.descripcion || 'Estudio de imágenes',
      tipoTraslado: data.tipoTraslado || 'camilla',
      regionAnatomica: data.regionAnatomica || 'Tórax',
      lateralidad: data.lateralidad,
      conContraste: Boolean(data.conContraste),
      prioridad: data.prioridad || 'normal',
      aislamiento: Boolean(data.aislamiento),
      estado: data.estado || 'solicitado',
      motivo: data.motivo || '',
      fechaSolicitud: data.fechaSolicitud || Date.now(),
      historial: data.historial || [{ estado: data.estado || 'solicitado', ts: Date.now(), por: data.creadoPor || null }],
      avisoPendiente: data.avisoPendiente,
      ordenMedica: data.ordenMedica || null,
      casoRojo: data.casoRojo,
      camaGuardia: data.camaGuardia,
      emergenciaVista: null,
    };
    this.pedidos.unshift(nuevo);
    return nuevo;
  }

  public updatePedido(id: string, updates: Partial<Pedido>): Pedido | null {
    const idx = this.pedidos.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.pedidos[idx] = { ...this.pedidos[idx], ...updates };
    return this.pedidos[idx];
  }

  public cambiarEstadoPedido(id: string, estado: string, userId: string): Pedido | null {
    const idx = this.pedidos.findIndex(p => p.id === id);
    if (idx === -1) return null;
    const pedido = this.pedidos[idx];
    const historial = Array.isArray(pedido.historial) ? [...pedido.historial] : [];
    historial.push({ estado, ts: Date.now(), por: userId });
    pedido.estado = estado;
    pedido.historial = historial;
    return pedido;
  }

  public acuseReciboEmergencia(id: string, userId: string): Pedido | null {
    const idx = this.pedidos.findIndex(p => p.id === id);
    if (idx === -1) return null;
    const pedido = this.pedidos[idx];
    pedido.emergenciaVista = { ts: Date.now(), por: userId };
    return pedido;
  }
}

export const store = new MemoryStore();
