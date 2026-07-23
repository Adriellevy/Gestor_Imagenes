# API FHIR (HL7 R4) — Suma Care Gestor de Imágenes

Vía de integración alternativa al contrato REST JSON propio (`documentacion/Version 30/Requerimientos_Integracion_SumaCare_HIS.md`). Un HIS que ya hable FHIR nativo puede usar esto en vez de adaptarse al JSON propio; ambas convivan, ninguna reemplaza a la otra.

Implementación: `server/src/fhir/`. FHIR versión R4 (`4.0.1`).

## Alcance

- **Ingesta**: Suma Care recibe recursos FHIR desde el HIS y los traduce a las entidades internas (`Paciente`, `Internacion`, `Pedido`, `Usuario`), reusando los mismos services que ya usa el resto de la API (`PacientesService`, `InternacionesService`, `PedidosService`, `UsuariosService`).
- **Exposición**: Suma Care también expone su propio worklist como recursos FHIR, para que otros sistemas puedan consultarlo. Esto es una decisión consciente que amplía el principio "100% solo lectura" del doc de requerimientos institucional — vale la pena tenerlo presente.
- **Recursos cubiertos**: `Patient`, `Encounter`, `ServiceRequest`, `Practitioner` (+ `PractitionerRole` como complemento opcional de `Practitioner`).
- **Fuera de alcance** (a propósito, no es un olvido): conformance FHIR completa (StructureDefinitions/perfiles), `Subscription` resource, SMART on FHIR/OAuth2, terminology server propio, `Coverage` (obra social).

## Autenticación

Todos los endpoints bajo `/fhir/*` requieren:
```
Authorization: Bearer <FHIR_INGEST_API_KEY>
```
excepto `GET /fhir/metadata`, que es público (convención FHIR estándar, para que un cliente pueda descubrir capacidades sin credenciales). El valor de `FHIR_INGEST_API_KEY` se configura en `server/.env` — cambiarlo en cualquier ambiente que no sea desarrollo local.

Sin header o token inválido → `401 Unauthorized`.

## Convenciones propias (`system`/`extension`)

FHIR no tiene un slot nativo para todo lo que maneja Suma Care. Se usan URIs propias, documentadas en `server/src/fhir/mappers/fhir-extensions.ts`:

| URI | Uso |
|---|---|
| `urn:sumacare:hc` | `Patient.identifier.system` para la historia clínica (`hc`) |
| `urn:sumacare:documento:<TIPO>` | `Patient.identifier.system` para el documento (`<TIPO>` = DNI, PASAPORTE, etc.), `identifier.value` = número |
| `urn:sumacare:tipo-estudio` | `ServiceRequest.code.coding.system`; `coding.code` debe ser un `codigo` válido de `gi_tipo_estudio` (`tc`, `rm`, `mn`, `rx`, `eco`, `ecocardio`) |
| `urn:sumacare:matricula` | `Practitioner.identifier.system` |
| `urn:sumacare:ext:obraSocial` | extension de `Patient` (valueString) |
| `urn:sumacare:ext:ubicacion:sector` / `:habitacion` / `:cama` | extensions de `Encounter` (valueString) |
| `urn:sumacare:ext:servicioSolicitante` | extension de `ServiceRequest` (valueString) |
| `urn:sumacare:ext:tipoTraslado` | extension de `ServiceRequest` (valueString: `habitacion`, `silla`, `camilla`, `asistido`, `ambulatorio`) |
| `urn:sumacare:ext:lateralidad` | extension de `ServiceRequest` (valueString) |
| `urn:sumacare:ext:conContraste` | extension de `ServiceRequest` (valueBoolean) |
| `urn:sumacare:ext:rol` | extension de `Practitioner` (valueString: `medico`, `tecnico`, `administrativo`, `admin`) — se ignora si viene un `PractitionerRole` en el mismo Bundle |
| `urn:sumacare:ext:servicio` | extension de `Practitioner` (valueString) |

Tablas de mapeo de códigos (gender, status, priority) en `server/src/fhir/mappers/coding-maps.ts` — ante un valor no reconocido, cae a un default razonable en vez de rechazar el recurso.

## Ingesta

### `POST /fhir/ingest` — Bundle completo

Body: un `Bundle` (`type: "collection"` o `"transaction"`) con `entry[].resource` mezclando `Patient`, `Encounter`, `ServiceRequest`, `Practitioner`, `PractitionerRole`. Se procesan en este orden (mismo orden que exigen las FKs en MySQL): `Practitioner` → `Patient` → `Encounter` → `ServiceRequest`. `PractitionerRole` no genera fila propia, solo aporta el `rol`/`servicio` del `Practitioner` correspondiente (matcheado por `PractitionerRole.practitioner.reference`).

Respuesta: array de `{ resourceType, id, status: "created" }`, uno por cada entry procesada. El `id` de `ServiceRequest` en la respuesta **no** es el que vino en el recurso — `PedidosService.create()` siempre genera su propio id interno (`ped_xxx`); `Patient`/`Encounter`/`Practitioner` sí preservan el `id` que mandó el HIS.

```bash
curl -X POST http://localhost:3000/fhir/ingest \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Bundle",
    "type": "collection",
    "entry": [
      { "resource": {
          "resourceType": "Practitioner", "id": "med001",
          "name": [{ "text": "Dra. Fernández" }],
          "extension": [{ "url": "urn:sumacare:ext:rol", "valueString": "medico" }]
      }},
      { "resource": {
          "resourceType": "Patient", "id": "pac001",
          "identifier": [
            { "system": "urn:sumacare:hc", "value": "HC-445021" },
            { "system": "urn:sumacare:documento:DNI", "value": "34567890" }
          ],
          "name": [{ "family": "RODRIGUEZ", "given": ["CARLOS ALBERTO"] }],
          "birthDate": "1985-08-14",
          "gender": "male"
      }},
      { "resource": {
          "resourceType": "Encounter", "id": "enc001",
          "status": "in-progress",
          "subject": { "reference": "Patient/pac001" },
          "serviceType": { "text": "Clínica Médica" },
          "period": { "start": "2026-07-20T10:00:00Z" },
          "extension": [
            { "url": "urn:sumacare:ext:ubicacion:sector", "valueString": "Piso 3 - Ala Norte" },
            { "url": "urn:sumacare:ext:ubicacion:habitacion", "valueString": "304" },
            { "url": "urn:sumacare:ext:ubicacion:cama", "valueString": "Cama B" }
          ]
      }},
      { "resource": {
          "resourceType": "ServiceRequest", "id": "ord001",
          "status": "active", "intent": "order", "priority": "stat",
          "subject": { "reference": "Patient/pac001" },
          "encounter": { "reference": "Encounter/enc001" },
          "requester": { "reference": "Practitioner/med001" },
          "code": {
            "coding": [{ "system": "urn:sumacare:tipo-estudio", "code": "tc" }],
            "text": "Angiotomografía de tórax (protocolo TEP)"
          },
          "bodySite": [{ "text": "Tórax" }],
          "reasonCode": [{ "text": "Insuficiencia respiratoria aguda, disnea súbita. Descartar TEP." }],
          "authoredOn": "2026-07-20T10:05:00Z",
          "extension": [
            { "url": "urn:sumacare:ext:tipoTraslado", "valueString": "camilla" },
            { "url": "urn:sumacare:ext:conContraste", "valueBoolean": true }
          ]
      }}
    ]
  }'
```

### `POST /fhir/ingest/:resourceType` — recurso suelto

Para HIS que prefieren mandar un recurso por vez sin armar Bundle. `:resourceType` = `Patient` | `Encounter` | `ServiceRequest` | `Practitioner`. Body: el recurso FHIR directo (sin envolver en Bundle/entry).

```bash
curl -X POST http://localhost:3000/fhir/ingest/Patient \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{ "id": "pac002", "identifier": [...], "name": [...], "birthDate": "...", "gender": "female" }'
```

### Errores de ingesta

Los mappers (`server/src/fhir/mappers/*.mapper.ts`) validan lo mínimo indispensable y tiran `400 Bad Request` con mensaje explícito si falta algo — por ejemplo:
- `Patient` sin `id`, o sin `identifier` con `system=urn:sumacare:hc` y `system=urn:sumacare:documento:<tipo>`.
- `Encounter` sin `subject.reference`.
- `ServiceRequest` sin `encounter.reference`, o con `code.coding` sin `system=urn:sumacare:tipo-estudio`, o con un `code` que no existe en `gi_tipo_estudio` (esto último lo tira `PedidosService` como `404 Not Found`, no el mapper).
- Encounter/ServiceRequest referenciando un `Patient`/`Encounter` que no fue ingerido antes (o en el mismo Bundle, antes en el orden de procesamiento) → falla por constraint de FK en MySQL.

Body malformado (no es un `Bundle` válido, `entry` no es array, etc.) → `400 Bad Request` de la validación estructural (`class-validator`, ver `server/src/fhir/dto/fhir-bundle.dto.ts`) antes de llegar a los mappers.

## Exposición (lectura)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/fhir/metadata` | `CapabilityStatement` — público, sin auth |
| `GET` | `/fhir/Patient/:id` | Un paciente |
| `GET` | `/fhir/Encounter/:id` | Una internación |
| `GET` | `/fhir/Practitioner/:id` | Un usuario/médico |
| `GET` | `/fhir/ServiceRequest/:id` | Un pedido (busca en activos + terminados) |
| `GET` | `/fhir/ServiceRequest?patient=<id>&status=<estado>` | Búsqueda por paciente y/o estado interno (`solicitado`, `en_proceso`, `realizado`, `cancelado`, etc.), ambos filtros opcionales |

`404 Not Found` si el `id` no existe.

```bash
curl -H "Authorization: Bearer <API_KEY>" http://localhost:3000/fhir/Patient/p1
curl -H "Authorization: Bearer <API_KEY>" "http://localhost:3000/fhir/ServiceRequest?status=solicitado"
curl http://localhost:3000/fhir/metadata
```

## Mapeo de campos

| FHIR | Interno | Notas |
|---|---|---|
| `Patient.id` | `Paciente.id` | se preserva tal cual |
| `Patient.identifier[system=hc]` | `hc` | |
| `Patient.identifier[system=documento:*]` | `documento.tipo`/`documento.numero` | |
| `Patient.name[0].family`/`.given` | `apellido`/`nombre` | |
| `Patient.birthDate` | `fechaNacimiento` | |
| `Patient.gender` | `sexo` | `male↔M`, `female↔F`, resto↔`O` |
| `Encounter.id` | `Internacion.id` | se preserva tal cual |
| `Encounter.subject.reference` | `pacienteId` | `Patient/<id>` |
| `Encounter.serviceType` | `servicioId` | |
| extensions `ubicacion:*` | `ubicacion.{sector,habitacion,cama}` | |
| `Encounter.status` | `estado` | `finished↔alta`, `cancelled↔cancelada`, resto↔`activa` |
| `Encounter.period.start`/`.end` | `fechaIngreso`/`fechaAlta` | |
| `ServiceRequest.id` | — | **no se preserva**, `Pedido.id` se autogenera |
| `ServiceRequest.encounter.reference` | `internacionId` | `Encounter/<id>` |
| `ServiceRequest.code.coding[system=tipo-estudio].code` | `modalidad` → resuelto a `gi_tipo_estudio` | mismo resolver que usa `POST /pedidos` |
| `ServiceRequest.code.text` | `descripcion` | |
| `ServiceRequest.priority` | `prioridad` | `stat/asap/urgent↔urgente`, resto↔`normal` |
| `ServiceRequest.reasonCode[0].text` | `motivo` | |
| `ServiceRequest.bodySite[0].text` | `regionAnatomica` | |
| ext `lateralidad`/`conContraste`/`tipoTraslado`/`servicioSolicitante` | ídem | |
| `ServiceRequest.requester.reference` | `creadoPor` | `Practitioner/<id>`, FK real a `gi_usuarios.id` |
| `ServiceRequest.status` | `estado` | `draft↔autorizacion_pendiente`, `completed↔realizado`, `revoked↔cancelado`, resto↔`solicitado`/`active` |
| `ServiceRequest.authoredOn` | `fechaSolicitud` | |
| `Practitioner.id` | `Usuario.id` | se preserva tal cual |
| `Practitioner.name[0]` | `nombre` | |
| `PractitionerRole.code` / ext `rol` | `rol` | |

## Probarlo vos mismo

1. `cd server && npm run start:dev`.
2. `curl http://localhost:3000/fhir/metadata` (sin auth, confirma que el server responde).
3. Usá el `FHIR_INGEST_API_KEY` de `server/.env` como Bearer token para el resto.
4. `GET /pacientes` para agarrar un `id` real y probar `GET /fhir/Patient/:id`.
5. `POST /fhir/ingest` con el Bundle de ejemplo de arriba, después confirmá en `GET /pacientes`/`/internaciones`/`/pedidos`/`/usuarios` que aparecieron las filas nuevas.
6. `POST /reset` para limpiar datos de prueba.

## Archivos relevantes

- `server/src/fhir/fhir.module.ts` — wiring del módulo
- `server/src/fhir/fhir-ingest.controller.ts` / `.service.ts` — ingesta
- `server/src/fhir/fhir-read.controller.ts` / `.service.ts` — exposición
- `server/src/fhir/fhir-capability.ts` — `CapabilityStatement`
- `server/src/fhir/guards/fhir-api-key.guard.ts` — auth
- `server/src/fhir/mappers/*.mapper.ts` — traducción por recurso
- `server/src/fhir/mappers/coding-maps.ts` — mapeo de enums/status
- `server/src/fhir/mappers/fhir-extensions.ts` — convenciones de `system`/`extension` propias
