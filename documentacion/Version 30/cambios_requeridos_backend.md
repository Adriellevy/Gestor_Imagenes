# Especificaciones y Cambios Requeridos en Backend: Soporte para Worklist v30

Este documento constituye la **guía técnica oficial y exhaustiva** de todos los cambios, adiciones de contratos de API, nuevos endpoints y modificaciones en el modelo de datos que deben implementarse en el servidor NestJS (`server/`) y en la capa de servicios HTTP del cliente (`cliente-web/src/services/api.ts`) para dar soporte integral a las reglas de negocio y funcionalidades del prototipo **`worklist-imagenes-v30.jsx`**.

> [!IMPORTANT]
> **Hallazgo de Auditoría Técnica**: A diferencia de versiones anteriores de este documento (redactadas sin auditar el backend), una inspección minuciosa del código de NestJS (`server/src/pedidos/entities/pedido.entity.ts` y `server/src/data/types.ts`) reveló que **la gran mayoría de los campos avanzados de la v30 ya se encuentran implementados en la base de datos**. Este informe separa con precisión milimétrica lo preexistente de lo verdaderamente faltante.

---

## 1. Actualización de Esquemas y Entidades (DTOs / Base de Datos)

Para que el servidor almacene y devuelva exactamente la misma información que maneja la v30 en memoria, se evaluó el modelo actual en `server/src/data/types.ts` y las entidades de TypeORM.

### 1.1 Entidad `Pedido`: Estado Actual vs. Requerimientos v30

La siguiente tabla detalla el estado real de cada campo avanzado en el servidor NestJS y las acciones exactas a tomar:

| Campo | Tipo de Dato | Estado en NestJS Actual (`pedido.entity.ts` / `types.ts`) | Descripción y Uso Funcional en v30 | Acción Requerida en Backend |
| :--- | :--- | :--- | :--- | :--- |
| `emergenciaVista` | `{ ts: number; por: string }` | ❌ **Ausente** | **Crítico**: Almacena el timestamp (`ts`) y el ID del usuario (`por`) que acusó recibo de una alerta de código rojo. Si es nulo o indefinido, el frontend dispara la alarma sonora continua. | **Implementar**: Agregar a `Pedido` en `types.ts` y como `@Column({ type: 'simple-json', nullable: true })` en `pedido.entity.ts`. |
| `ordenMedica` | `{ nombre: string; datos: string; tipo?: string }` | ✅ **Ya implementado** | Contiene los datos adjuntos de la orden médica digitalizada adjuntada en el modal de pedido. | **Ninguna**: Mantener implementación actual. |
| `casoRojo` | `string` | ✅ **Ya implementado** | Guarda el ID de caso estandarizado (ej. `"4"` para *Rx Tórax - Neumotórax en habitación*) en prioridades urgentes. | **Ninguna**: Mantener implementación actual. |
| `camaGuardia` | `string` | ✅ **Ya implementado** | Ubicación o cama específica dentro del box de Guardia (ej. `"Guardia 2"`). | **Ninguna**: Mantener implementación actual. |
| `aislamiento` | `boolean` | ✅ **Ya implementado** | Indica si el paciente requiere precauciones de aislamiento de contacto o respiratorio (EPP). | **Ninguna**: Mantener implementación actual. |
| `avisoPendiente` | `string` | ✅ **Ya implementado** | Bandera temporal (`"cancel"`, `"sintraslado"`, `"modif"`) para alertas emergentes a camillería. | **Ninguna**: Mantener implementación actual. |

#### Especificación TypeScript Corregida para `server/src/data/types.ts`

```typescript
export interface Pedido {
  id: string;
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
  historial?: Array<{ estado: string; ts: number; por?: string }>;
  
  // Campos ya preexistentes en NestJS:
  avisoPendiente?: string;
  aislamiento?: boolean;
  ordenMedica?: { nombre: string; datos: string; tipo?: string } | null;
  casoRojo?: string;
  camaGuardia?: string;

  // [NUEVO] Único campo estructural a adicionar para paridad v30:
  emergenciaVista?: { ts: number; por: string } | null;
}
```

### 1.2 Entidad `Internacion` y Ubicaciones de Pacientes

En el backend, la entidad `Internacion` ([internacion.entity.ts](file:///c:/Users/adrie/OneDrive/Escritorio/Suma%20Care/Gestor_Imagenes/server/src/internaciones/entities/internacion.entity.ts)) ya modela la ubicación mediante el campo `@Column({ type: 'simple-json' }) ubicacion: { sector: string; habitacion: string; cama: string }`.
* **Brecha detectada**: Aunque la base de datos soporta perfectamente la estructura de ubicación, el controlador y el servicio carecen de métodos para mutar estos datos tras el ingreso del paciente.

---

## 2. Nuevos Endpoints REST Requeridos

Actualmente, el servidor expone endpoints de CRUD básico y cambio de estado general (`PATCH /pedidos/:id/estado`). Para dar soporte a la interactividad operacional de la v30, es indispensable añadir los siguientes endpoints específicos en los controladores de NestJS:

### 2.1 Acuse de Recibo de Alarma Código Rojo (`PATCH /pedidos/:id/vista`)

Permite al personal de imágenes o guardia detener la alarma sonora en toda la sala y registrar la auditoría de quién visualizó la emergencia médica.

* **Método HTTP**: `PATCH`
* **Ruta**: `/pedidos/:id/vista`
* **Headers**: `Authorization: Bearer <token>`
* **Cuerpo del Request (Payload)**:
  ```json
  {
    "userId": "u3"
  }
  ```
* **Lógica a implementar en `pedidos.controller.ts` y `pedidos.service.ts`**:
  1. Buscar el pedido por ID.
  2. Validar que el pedido exista y tenga `prioridad === "urgente"`.
  3. Asignar `pedido.emergenciaVista = { ts: Date.now(), por: req.body.userId }`.
  4. Guardar en TypeORM y retornar el pedido actualizado con HTTP 200.

---

### 2.2 Actualización en Caliente de Cama del Paciente (`PATCH /internaciones/:id/ubicacion`)

> [!WARNING]
> **Deficiencia en Controlador Actual**: El archivo [internaciones.controller.ts](file:///c:/Users/adrie/OneDrive/Escritorio/Suma%20Care/Gestor_Imagenes/server/src/internaciones/internaciones.controller.ts) solo posee `@Get() findAll()` y `@Post() create()`. No existe forma de trasladar a un paciente de cama o sector mediante la API REST sin este nuevo endpoint.

En el hospital es frecuente que un paciente internado sea reubicado (ej. de Guardia a Piso o de Piso a Telemetría) mientras un estudio se encuentra pendiente en la cola. En v30, esto se resuelve con edición directa en la tarjeta de estudio.

* **Método HTTP**: `PATCH`
* **Ruta**: `/internaciones/:id/ubicacion`
* **Headers**: `Authorization: Bearer <token>`
* **Cuerpo del Request (Payload)**:
  ```json
  {
    "cama": "UTI1 5",
    "sector": "UTI 1 (5to piso)" 
  }
  ```
* **Lógica a implementar en `internaciones.controller.ts` y `internaciones.service.ts`**:
  1. Buscar la internación activa por ID (`internacionId`).
  2. Actualizar las propiedades recibidas dentro del objeto `ubicacion` (`ubicacion.cama` y opcionalmente `ubicacion.sector`).
  3. Retornar la internación actualizada. Las siguientes llamadas o hidrataciones reflejarán automáticamente al paciente en su nueva cama en todas las interfaces del hospital.

---

### 2.3 Modificación de Traslado ("Hacer en Origen" / Cama)

En v30, si el servicio de imágenes determina que el paciente no está en condiciones de ser trasladado en camilla, puede pulsar la acción rápida **"Hacer en origen"**, mutando el traslado a `"habitacion"`.
* **Soporte en Backend**: Se reutilizará el endpoint existente `PATCH /pedidos/:id` (implementado en el método `update` de `pedidos.controller.ts`), enviando el payload:
  ```json
  {
    "tipoTraslado": "habitacion",
    "estado": "solicitado",
    "avisoPendiente": "sintraslado"
  }
  ```

---

## 3. Actualización de la Capa de Servicios (`cliente-web/src/services/api.ts`)

Para que la aplicación React/Vite pueda consumir los nuevos endpoints del backend, se deberán exportar y tipar los siguientes métodos en el archivo [api.ts](file:///c:/Users/adrie/OneDrive/Escritorio/Suma%20Care/Gestor_Imagenes/cliente-web/src/services/api.ts):

```typescript
// Implementación requerida en cliente-web/src/services/api.ts

export const acuseReciboEmergencia = async (id: string, userId: string): Promise<Pedido> => {
  const { data } = await api.patch(`/pedidos/${id}/vista`, { userId });
  return data;
};

export const updateUbicacionInternacion = async (
  internacionId: string, 
  cama: string, 
  sector?: string
): Promise<Internacion> => {
  const { data } = await api.patch(`/internaciones/${internacionId}/ubicacion`, { cama, sector });
  return data;
};
```

---

## 4. Sincronización de Datos Semilla (`server/src/data/seed.ts`)

Cuando el sistema o un usuario ejecuta el reinicio del entorno de demostración (`POST /reset`), el backend regenera la base de datos en memoria o SQLite utilizando el archivo [seed.ts](file:///c:/Users/adrie/OneDrive/Escritorio/Suma%20Care/Gestor_Imagenes/server/src/data/seed.ts).

### Modificaciones Requeridas para el Script de Semilla:

1. **Pedido Urgente sin Acuse de Recibo (Prueba de Alarma Sonora)**:
   * En el arreglo `RAW_PEDIDOS_SEED`, se debe insertar o modificar un pedido con `prioridad: "urgente"` y `estado: "solicitado"` para que explícitamente tenga **`emergenciaVista: null`** (o indefinido).
   * **Objetivo**: Garantizar que, tan pronto se inicie sesión en el cliente web, la UI detecte la emergencia pendiente y active inmediatamente el triple tono de alarma de la sala de imágenes.
2. **Alineación de Padrón y Sectores**:
   * Verificar que las listas estáticas de servicios (`PADRON_HOSPITAL` y asignaciones en `INTERNACIONES`) coincidan al 100% con los catálogos hospitalarios de v30, evitando discrepancias al renderizar nombres de sectores o números de cama en los modales de traslado.
