// Tablas de mapeo bidireccional entre valores FHIR R4 y los valores internos
// de Suma Care. Son mapeos best-effort en un límite de integración: ante un
// valor no reconocido, se cae a un default razonable en vez de lanzar error
// (un HIS externo no debería poder tumbar la ingesta por un código atípico).

export function fhirGenderToSexo(gender?: string): string {
  switch (gender) {
    case 'male': return 'M';
    case 'female': return 'F';
    default: return 'O';
  }
}

export function sexoToFhirGender(sexo: string): 'male' | 'female' | 'other' | 'unknown' {
  switch (sexo) {
    case 'M': return 'male';
    case 'F': return 'female';
    case 'O': return 'other';
    default: return 'unknown';
  }
}

export function fhirEncounterStatusToEstado(status?: string): string {
  switch (status) {
    case 'finished': return 'alta';
    case 'cancelled': return 'cancelada';
    case 'planned':
    case 'arrived':
    case 'triaged':
    case 'in-progress':
    case 'onleave':
    default: return 'activa';
  }
}

export function estadoInternacionToFhirStatus(estado: string): string {
  switch (estado) {
    case 'alta': return 'finished';
    case 'cancelada': return 'cancelled';
    default: return 'in-progress';
  }
}

export function fhirPriorityToPrioridad(priority?: string): string {
  switch (priority) {
    case 'urgent':
    case 'asap':
    case 'stat': return 'urgente';
    default: return 'normal';
  }
}

export function prioridadToFhirPriority(prioridad: string): 'routine' | 'urgent' | 'asap' | 'stat' {
  switch (prioridad) {
    case 'urgente': return 'stat';
    case 'prioritario': return 'urgent';
    default: return 'routine';
  }
}

// El estado interno del Pedido es más granular que el status estándar de
// ServiceRequest (incluye pasos logísticos propios: autorización, traslado).
// El mapeo FHIR -> interno solo cubre los estados "de entrada" razonables
// para un pedido que recién ingresa desde el HIS.
export function fhirServiceRequestStatusToEstado(status?: string): string {
  switch (status) {
    case 'draft': return 'autorizacion_pendiente';
    case 'completed': return 'realizado';
    case 'revoked':
    case 'entered-in-error': return 'cancelado';
    case 'active':
    default: return 'solicitado';
  }
}

export function estadoPedidoToFhirStatus(estado: string): string {
  switch (estado) {
    case 'autorizacion_pendiente': return 'draft';
    case 'realizado': return 'completed';
    case 'cancelado': return 'revoked';
    case 'solicitado':
    case 'traslado_solicitado':
    case 'en_proceso':
    case 'traslado_retorno':
    default: return 'active';
  }
}
