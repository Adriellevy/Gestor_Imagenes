import { Injectable, BadRequestException } from '@nestjs/common';
import { PacientesService } from '../pacientes/pacientes.service';
import { InternacionesService } from '../internaciones/internaciones.service';
import { PedidosService } from '../pedidos/pedidos.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { FhirBundleDto } from './dto/fhir-bundle.dto';
import { fhirPatientToPaciente } from './mappers/patient.mapper';
import { fhirEncounterToInternacion } from './mappers/encounter.mapper';
import { fhirServiceRequestToPedido } from './mappers/service-request.mapper';
import { fhirPractitionerToUsuario } from './mappers/practitioner.mapper';
import { referenceId } from './mappers/fhir-extensions';

export interface IngestResult {
  resourceType: string;
  id: string;
  status: 'created';
}

// Orden de procesamiento de un Bundle mixto: Practitioner y Patient primero
// (referenciados por FK desde Encounter/ServiceRequest), después Encounter,
// después ServiceRequest — mismo orden que exigen las FKs reales en MySQL.
const INGEST_ORDER = ['Practitioner', 'Patient', 'Encounter', 'ServiceRequest'];

@Injectable()
export class FhirIngestService {
  constructor(
    private readonly pacientesService: PacientesService,
    private readonly internacionesService: InternacionesService,
    private readonly pedidosService: PedidosService,
    private readonly usuariosService: UsuariosService,
  ) {}

  async ingestBundle(bundle: FhirBundleDto): Promise<IngestResult[]> {
    const resources = bundle.entry.map((e) => e.resource);

    const roles = resources.filter((r) => r.resourceType === 'PractitionerRole') as unknown as fhir4.PractitionerRole[];
    const roleByPractitioner = new Map(roles.map((r) => [referenceId(r.practitioner?.reference), r]));

    const results: IngestResult[] = [];
    for (const type of INGEST_ORDER) {
      for (const resource of resources.filter((r) => r.resourceType === type)) {
        results.push(await this.ingestOne(resource, roleByPractitioner));
      }
    }
    return results;
  }

  async ingestOne(
    resource: any,
    roleByPractitioner?: Map<string | undefined, fhir4.PractitionerRole>,
  ): Promise<IngestResult> {
    switch (resource.resourceType) {
      case 'Patient': {
        const paciente = fhirPatientToPaciente(resource);
        await this.pacientesService.create(paciente);
        return { resourceType: 'Patient', id: paciente.id, status: 'created' };
      }
      case 'Encounter': {
        const internacion = fhirEncounterToInternacion(resource);
        await this.internacionesService.create(internacion);
        return { resourceType: 'Encounter', id: internacion.id, status: 'created' };
      }
      case 'ServiceRequest': {
        const pedido = fhirServiceRequestToPedido(resource);
        const creado = await this.pedidosService.create(pedido);
        return { resourceType: 'ServiceRequest', id: creado.id, status: 'created' };
      }
      case 'Practitioner': {
        const role = roleByPractitioner?.get(resource.id);
        const usuario = fhirPractitionerToUsuario(resource, role);
        await this.usuariosService.upsert(usuario);
        return { resourceType: 'Practitioner', id: usuario.id, status: 'created' };
      }
      case 'PractitionerRole':
        // se consume junto al Practitioner correspondiente, no genera fila propia
        return { resourceType: 'PractitionerRole', id: resource.id ?? '', status: 'created' };
      default:
        throw new BadRequestException(`resourceType no soportado: ${resource.resourceType}`);
    }
  }
}
