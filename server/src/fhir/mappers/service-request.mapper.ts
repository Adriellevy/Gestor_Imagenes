import { BadRequestException } from '@nestjs/common';
import { SYSTEM, EXT, getExtString, getExtBoolean, stringExt, booleanExt, referenceId } from './fhir-extensions';
import {
  fhirPriorityToPrioridad,
  prioridadToFhirPriority,
  fhirServiceRequestStatusToEstado,
  estadoPedidoToFhirStatus,
} from './coding-maps';

// Forma plana que ya acepta PedidosService.create()/toApiShape() — no se
// toca pedidos.service.ts, el mapper arma exactamente lo que el endpoint
// POST /pedidos ya recibe hoy. El id de Pedido lo sigue generando el
// service (no se preserva ServiceRequest.id de entrada).
export interface PedidoIngestBody {
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
}

export function fhirServiceRequestToPedido(resource: fhir4.ServiceRequest): PedidoIngestBody {
  const internacionId = referenceId(resource.encounter?.reference);
  if (!internacionId) {
    throw new BadRequestException('ServiceRequest.encounter.reference (Encounter/<id>) es requerido');
  }

  const modalidad = resource.code?.coding?.find((c) => c.system === SYSTEM.tipoEstudio)?.code;
  if (!modalidad) {
    throw new BadRequestException(`ServiceRequest.code.coding debe incluir system=${SYSTEM.tipoEstudio}`);
  }

  const extension = resource.extension as any;

  return {
    internacionId,
    servicioSolicitanteId: getExtString(extension, EXT.servicioSolicitante) ?? '',
    creadoPor: referenceId(resource.requester?.reference),
    modalidad,
    descripcion: resource.code?.text ?? resource.orderDetail?.[0]?.text ?? '',
    tipoTraslado: getExtString(extension, EXT.tipoTraslado) ?? 'habitacion',
    regionAnatomica: resource.bodySite?.[0]?.text ?? resource.bodySite?.[0]?.coding?.[0]?.display ?? '',
    lateralidad: getExtString(extension, EXT.lateralidad),
    conContraste: getExtBoolean(extension, EXT.conContraste),
    prioridad: fhirPriorityToPrioridad(resource.priority),
    estado: fhirServiceRequestStatusToEstado(resource.status),
    motivo: resource.reasonCode?.[0]?.text ?? '',
    fechaSolicitud: resource.authoredOn ? Date.parse(resource.authoredOn) : Date.now(),
  };
}

// pedido acá es la forma aplanada que ya devuelve PedidosService (modalidad/
// descripcion planos, ver toApiShape en pedidos.service.ts). pacienteId se
// pasa aparte porque el service de Pedidos no hace join hasta Paciente.
export function pedidoToFhirServiceRequest(pedido: any, pacienteId: string): fhir4.ServiceRequest {
  const extension = [
    stringExt(EXT.servicioSolicitante, pedido.servicioSolicitanteId),
    stringExt(EXT.tipoTraslado, pedido.tipoTraslado),
    stringExt(EXT.lateralidad, pedido.lateralidad),
    booleanExt(EXT.conContraste, pedido.conContraste),
  ].filter(Boolean) as fhir4.Extension[];

  return {
    resourceType: 'ServiceRequest',
    id: pedido.id,
    status: estadoPedidoToFhirStatus(pedido.estado) as fhir4.ServiceRequest['status'],
    intent: 'order',
    priority: prioridadToFhirPriority(pedido.prioridad),
    subject: { reference: `Patient/${pacienteId}` },
    encounter: { reference: `Encounter/${pedido.internacionId}` },
    ...(pedido.creadoPor ? { requester: { reference: `Practitioner/${pedido.creadoPor}` } } : {}),
    code: {
      coding: pedido.modalidad ? [{ system: SYSTEM.tipoEstudio, code: pedido.modalidad }] : [],
      text: pedido.descripcion,
    },
    bodySite: pedido.regionAnatomica ? [{ text: pedido.regionAnatomica }] : undefined,
    reasonCode: pedido.motivo ? [{ text: pedido.motivo }] : undefined,
    authoredOn: pedido.fechaSolicitud ? new Date(pedido.fechaSolicitud).toISOString() : undefined,
    extension,
  };
}
