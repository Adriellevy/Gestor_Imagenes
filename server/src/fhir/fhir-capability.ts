export function getFhirCapabilityStatement() {
  return {
    resourceType: 'CapabilityStatement',
    status: 'active',
    date: new Date().toISOString(),
    kind: 'instance',
    software: { name: 'Suma Care - Gestor de Imágenes', version: '1.0' },
    fhirVersion: '4.0.1',
    format: ['json'],
    rest: [
      {
        mode: 'server',
        resource: [
          { type: 'Patient', interaction: [{ code: 'read' }, { code: 'create' }] },
          { type: 'Encounter', interaction: [{ code: 'read' }, { code: 'create' }] },
          {
            type: 'ServiceRequest',
            interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }],
            searchParam: [
              { name: 'patient', type: 'reference' },
              { name: 'status', type: 'token' },
            ],
          },
          { type: 'Practitioner', interaction: [{ code: 'read' }, { code: 'create' }] },
        ],
      },
    ],
  };
}
