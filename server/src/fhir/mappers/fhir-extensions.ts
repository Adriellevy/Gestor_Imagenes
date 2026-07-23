// Convenciones propias de Suma Care para datos que no tienen un slot nativo
// en FHIR R4 (systems de identifier, extensions). Deben quedar documentadas
// para el equipo de sistemas del hospital que arme los recursos de entrada.

export const SYSTEM = {
  hc: 'urn:sumacare:hc',
  documentoPrefix: 'urn:sumacare:documento:', // + tipo, ej. urn:sumacare:documento:DNI
  tipoEstudio: 'urn:sumacare:tipo-estudio', // code = gi_tipo_estudio.codigo
  matricula: 'urn:sumacare:matricula',
};

export const EXT = {
  obraSocial: 'urn:sumacare:ext:obraSocial',
  ubicacionSector: 'urn:sumacare:ext:ubicacion:sector',
  ubicacionHabitacion: 'urn:sumacare:ext:ubicacion:habitacion',
  ubicacionCama: 'urn:sumacare:ext:ubicacion:cama',
  servicioSolicitante: 'urn:sumacare:ext:servicioSolicitante',
  tipoTraslado: 'urn:sumacare:ext:tipoTraslado',
  lateralidad: 'urn:sumacare:ext:lateralidad',
  conContraste: 'urn:sumacare:ext:conContraste',
  rol: 'urn:sumacare:ext:rol',
  servicio: 'urn:sumacare:ext:servicio',
};

interface Extension {
  url: string;
  valueString?: string;
  valueBoolean?: boolean;
}

export function getExtString(extensions: Extension[] | undefined, url: string): string | undefined {
  return extensions?.find((e) => e.url === url)?.valueString;
}

export function getExtBoolean(extensions: Extension[] | undefined, url: string, fallback = false): boolean {
  const ext = extensions?.find((e) => e.url === url);
  return ext?.valueBoolean ?? fallback;
}

export function stringExt(url: string, value?: string): Extension | null {
  return value ? { url, valueString: value } : null;
}

export function booleanExt(url: string, value?: boolean): Extension {
  return { url, valueBoolean: !!value };
}

export function referenceId(reference?: string): string | undefined {
  // "Patient/p1" -> "p1"
  return reference?.split('/').pop();
}
