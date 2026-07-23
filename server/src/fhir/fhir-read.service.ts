import { Injectable, NotFoundException } from '@nestjs/common';
import { PacientesService } from '../pacientes/pacientes.service';
import { InternacionesService } from '../internaciones/internaciones.service';
import { PedidosService } from '../pedidos/pedidos.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { pacienteToFhirPatient } from './mappers/patient.mapper';
import { internacionToFhirEncounter } from './mappers/encounter.mapper';
import { pedidoToFhirServiceRequest } from './mappers/service-request.mapper';
import { usuarioToFhirPractitioner } from './mappers/practitioner.mapper';

@Injectable()
export class FhirReadService {
  constructor(
    private readonly pacientesService: PacientesService,
    private readonly internacionesService: InternacionesService,
    private readonly pedidosService: PedidosService,
    private readonly usuariosService: UsuariosService,
  ) {}

  async getPatient(id: string): Promise<fhir4.Patient> {
    const pacientes = await this.pacientesService.findAll();
    const paciente = pacientes.find((p) => p.id === id);
    if (!paciente) throw new NotFoundException(`Patient/${id} no encontrado`);
    return pacienteToFhirPatient(paciente);
  }

  async getEncounter(id: string): Promise<fhir4.Encounter> {
    const internacion = await this.findInternacion(id);
    if (!internacion) throw new NotFoundException(`Encounter/${id} no encontrado`);
    return internacionToFhirEncounter(internacion);
  }

  async getPractitioner(id: string): Promise<fhir4.Practitioner> {
    const usuarios = await this.usuariosService.findAll();
    const usuario = usuarios.find((u) => u.id === id);
    if (!usuario) throw new NotFoundException(`Practitioner/${id} no encontrado`);
    return usuarioToFhirPractitioner(usuario);
  }

  async getServiceRequest(id: string): Promise<fhir4.ServiceRequest> {
    const pedidos = await this.allPedidos();
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido) throw new NotFoundException(`ServiceRequest/${id} no encontrado`);
    return this.toFhirServiceRequest(pedido);
  }

  async searchServiceRequests(patientId?: string, status?: string): Promise<fhir4.ServiceRequest[]> {
    let pedidos = await this.allPedidos();
    if (status) {
      pedidos = pedidos.filter((p) => p.estado === status);
    }
    if (patientId) {
      const internaciones = await this.internacionesService.findAll();
      const internacionIds = new Set(internaciones.filter((i) => i.pacienteId === patientId).map((i) => i.id));
      pedidos = pedidos.filter((p) => internacionIds.has(p.internacionId));
    }
    return Promise.all(pedidos.map((p) => this.toFhirServiceRequest(p)));
  }

  // pedidosService.findAll() solo trae pedidos activos (excluye realizado/
  // cancelado); se suma findTerminados para exponer el universo completo.
  private async allPedidos(): Promise<any[]> {
    const activos = await this.pedidosService.findAll();
    const terminados = await this.pedidosService.findTerminados(1, 10000);
    return [...activos, ...terminados.data];
  }

  private async findInternacion(id: string) {
    const internaciones = await this.internacionesService.findAll();
    return internaciones.find((i) => i.id === id);
  }

  private async toFhirServiceRequest(pedido: any): Promise<fhir4.ServiceRequest> {
    const internacion = await this.findInternacion(pedido.internacionId);
    return pedidoToFhirServiceRequest(pedido, internacion?.pacienteId ?? '');
  }
}
