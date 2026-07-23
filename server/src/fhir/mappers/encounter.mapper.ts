import { BadRequestException } from '@nestjs/common';
import { Internacion } from '../../internaciones/entities/internacion.entity';
import { EXT, getExtString, stringExt, referenceId } from './fhir-extensions';
import { estadoInternacionToFhirStatus, fhirEncounterStatusToEstado } from './coding-maps';

export function fhirEncounterToInternacion(resource: fhir4.Encounter): Internacion {
  if (!resource.id) {
    throw new BadRequestException('Encounter.id es requerido');
  }
  const pacienteId = referenceId(resource.subject?.reference);
  if (!pacienteId) {
    throw new BadRequestException('Encounter.subject.reference (Patient/<id>) es requerido');
  }

  const extension = resource.extension as any;
  const sector = getExtString(extension, EXT.ubicacionSector) ?? '';
  const habitacion = getExtString(extension, EXT.ubicacionHabitacion) ?? '';
  const cama = getExtString(extension, EXT.ubicacionCama) ?? '';

  return {
    id: resource.id,
    pacienteId,
    servicioId: resource.serviceType?.coding?.[0]?.display ?? resource.serviceType?.text ?? '',
    ubicacion: { sector, habitacion, cama },
    fechaIngreso: resource.period?.start ? Date.parse(resource.period.start) : Date.now(),
    fechaAlta: resource.period?.end ? Date.parse(resource.period.end) : null,
    estado: fhirEncounterStatusToEstado(resource.status),
  };
}

export function internacionToFhirEncounter(i: Internacion): fhir4.Encounter {
  const extension = [
    stringExt(EXT.ubicacionSector, i.ubicacion.sector),
    stringExt(EXT.ubicacionHabitacion, i.ubicacion.habitacion),
    stringExt(EXT.ubicacionCama, i.ubicacion.cama),
  ].filter(Boolean) as fhir4.Extension[];

  return {
    resourceType: 'Encounter',
    id: i.id,
    status: estadoInternacionToFhirStatus(i.estado) as fhir4.Encounter['status'],
    class: { code: 'IMP', display: i.servicioId },
    subject: { reference: `Patient/${i.pacienteId}` },
    serviceType: { text: i.servicioId },
    period: {
      start: new Date(i.fechaIngreso).toISOString(),
      ...(i.fechaAlta ? { end: new Date(i.fechaAlta).toISOString() } : {}),
    },
    extension,
  };
}
