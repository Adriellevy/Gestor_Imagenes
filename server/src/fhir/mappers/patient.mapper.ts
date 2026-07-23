import { BadRequestException } from '@nestjs/common';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { SYSTEM, EXT, getExtString, stringExt } from './fhir-extensions';
import { sexoToFhirGender, fhirGenderToSexo } from './coding-maps';

export function fhirPatientToPaciente(resource: fhir4.Patient): Paciente {
  if (!resource.id) {
    throw new BadRequestException('Patient.id es requerido');
  }

  const hc = resource.identifier?.find((i) => i.system === SYSTEM.hc)?.value;
  const documentoIdentifier = resource.identifier?.find((i) => i.system?.startsWith(SYSTEM.documentoPrefix));
  const tipoDocumento = documentoIdentifier?.system?.slice(SYSTEM.documentoPrefix.length);

  if (!hc || !documentoIdentifier || !tipoDocumento) {
    throw new BadRequestException(
      `Patient.identifier debe incluir system=${SYSTEM.hc} y system=${SYSTEM.documentoPrefix}<tipo>`,
    );
  }

  const name = resource.name?.[0];

  return {
    id: resource.id,
    hc,
    documento: { tipo: tipoDocumento, numero: documentoIdentifier.value ?? '' },
    apellido: name?.family ?? '',
    nombre: name?.given?.join(' ') ?? '',
    fechaNacimiento: resource.birthDate ?? '',
    sexo: fhirGenderToSexo(resource.gender),
    obraSocial: getExtString(resource.extension as any, EXT.obraSocial),
  };
}

export function pacienteToFhirPatient(p: Paciente): fhir4.Patient {
  const extension = [stringExt(EXT.obraSocial, p.obraSocial)].filter(Boolean) as fhir4.Extension[];

  return {
    resourceType: 'Patient',
    id: p.id,
    identifier: [
      { system: SYSTEM.hc, value: p.hc },
      { system: `${SYSTEM.documentoPrefix}${p.documento.tipo}`, value: p.documento.numero },
    ],
    name: [{ family: p.apellido, given: [p.nombre] }],
    birthDate: p.fechaNacimiento,
    gender: sexoToFhirGender(p.sexo),
    ...(extension.length ? { extension } : {}),
  };
}
