import { BadRequestException } from '@nestjs/common';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { SYSTEM, EXT, getExtString, stringExt } from './fhir-extensions';

export function fhirPractitionerToUsuario(resource: fhir4.Practitioner, role?: fhir4.PractitionerRole): Usuario {
  if (!resource.id) {
    throw new BadRequestException('Practitioner.id es requerido');
  }
  const name = resource.name?.[0];
  const nombre = name?.text ?? [name?.given?.join(' '), name?.family].filter(Boolean).join(' ');
  const extension = resource.extension as any;

  return {
    id: resource.id,
    nombre: nombre || resource.id,
    rol: role?.code?.[0]?.coding?.[0]?.code ?? getExtString(extension, EXT.rol) ?? 'medico',
    servicio: role?.code?.[0]?.text ?? getExtString(extension, EXT.servicio),
    sectores: [],
  };
}

export function usuarioToFhirPractitioner(u: Usuario): fhir4.Practitioner {
  const extension = [stringExt(EXT.rol, u.rol), stringExt(EXT.servicio, u.servicio)].filter(
    Boolean,
  ) as fhir4.Extension[];

  return {
    resourceType: 'Practitioner',
    id: u.id,
    identifier: [{ system: SYSTEM.matricula, value: u.id }],
    name: [{ text: u.nombre }],
    extension,
  };
}
