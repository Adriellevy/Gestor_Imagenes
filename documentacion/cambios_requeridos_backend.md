# Especificaciones y Cambios Requeridos en Backend: Soporte para Worklist v30

Tal como fue solicitado por el usuario, este documento consolida y exporta **exclusivamente todos los cambios, adiciones de contratos de API, nuevos endpoints y modificaciones en el modelo de datos** que deben implementarse en el servidor (NestJS en carpeta `server/`) y en la capa de servicios HTTP (`cliente-web/src/services/api.ts`) para dar soporte integral a la lógica y reglas de negocio del prototipo **`worklist-imagenes-v30.jsx`**.

---

## 1. Actualización de Esquemas y Entidades (DTOs / Base de Datos)

Para que el servidor almacene y devuelva exactamente la misma información que maneja el v30 en memoria, se debe modificar el modelo de datos en el backend (`server/src/data/types.ts` y las entidades NestJS de Pedidos e Internaciones).

### 1.1 Entidad `Pedido` (Nuevos Campos Requeridos)

| Campo | Tipo de Dato | Opcional / Nullable | Descripción y Uso Funcional (v30) |
| :--- | :--- | :--- | :--- |
| `emergenciaVista` | `{ ts: number; por: string }` | Sí (`nullable`) | **Crítico**: Almacena el timestamp (`ts`) y el ID del usuario (`por`) que acusó recibo de una alerta de código rojo. Si está nulo o indefinido, el frontend dispara la alarma sonora continua. |
| `ordenMedica` | `{ nombre: string; datos: string; tipo?: string }` | Sí (`nullable`) | Contiene los datos adjuntos de la orden médica digitalizada que se solicita en el modal de nuevo pedido de v30. |
| `casoRojo` | `string` | Sí (`nullable`) | Guarda el índice o identificador de caso estandarizado (ej. `"4"` para *Rx Tórax - Neumotórax en habitación*) cuando la prioridad es `"urgente"`. |
| `camaGuardia` | `string` | Sí (`nullable`) | Ubicación o cama específica dentro del box de Guardia (ej. `"Guardia 2"`). |
| `aislamiento` | `boolean` | No (default `false`) | Indica si el paciente requiere precauciones de aislamiento de contacto o respiratorio (EPP para camilleros). |
| `avisoPendiente` | `string` | Sí (`nullable`) | Bandera temporal (ej. `"cancel"`, `"sintraslado"`, `"modif"`) utilizada para mostrar alertas emergentes a camilleros cuando cambia un traslado. |

#### Especificación TypeScript para `server/src/data/types.ts`

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
  
  // Campos añadidos o formalizados en v30:
  emergenciaVista?: { ts: number; por: string } | null;
  ordenMedica?: { nombre: string; datos: string; tipo?: string } | null;
  casoRojo?: string;
  camaGuardia?: string;
  aislamiento?: boolean;
  avisoPendiente?: string;
}
```

---

## 2. Nuevos Endpoints REST Requeridos

Actualmente, el backend expone los endpoints básicos de CRUD y cambio de estado general (`PATCH /pedidos/:id/estado`). Para soportar la interactividad avanzada de la v30, se requiere exponer los siguientes endpoints o ampliar los existentes:

### 2.1 Acuse de Recibo de Alarma Código Rojo (`PATCH /pedidos/:id/vista`)

Permite al personal de imágenes detener la alarma sonora y marcar que están al tanto del código rojo entrante.

- **Método HTTP**: `PATCH`
- **Ruta**: `/pedidos/:id/vista`
- **Headers**: `Authorization: Bearer <token>`
- **Cuerpo del Request (Payload)**:
  ```json
  {
    "userId": "u3"
  }
  ```
- **Lógica en Backend**:
  1. Busca el pedido por ID.
  2. Valida que el pedido exista y tenga prioridad `"urgente"`.
  3. Establece `pedido.emergenciaVista = { ts: Date.now(), por: req.body.userId }`.
  4. Devuelve el pedido actualizado con HTTP 200.

---

### 2.2 Actualización en Caliente de Cama del Paciente (`PATCH /internaciones/:id/ubicacion`)

En el hospital es frecuente que un paciente sea trasladado a otra cama o sala de telemetría mientras el estudio está pendiente. En v30, esto se resuelve con un input en línea en la tarjeta de estudio.

- **Método HTTP**: `PATCH`
- **Ruta**: `/internaciones/:id/ubicacion`
- **Headers**: `Authorization: Bearer <token>`
- **Cuerpo del Request (Payload)**:
  ```json
  {
    "cama": "UTI1 5",
    "sector": "UTI 1 (5to piso)" 
  }
  ```
- **Lógica en Backend**:
  1. Busca la internación activa por ID.
  2. Actualiza `ubicacion.cama` y opcionalmente `ubicacion.sector`.
  3. Al devolver HTTP 200, la próxima llamada a `GET /pedidos` o hidratación en el cliente mostrará al paciente en la cama nueva automáticamente.

---

### 2.3 Modificación de Traslado ("Hacer en Origen" / Cama)

En v30, si el servicio de imágenes decide que no puede trasladar al paciente (ej. por inestabilidad hemodinámica), puede pulsar **"Hacer en origen"**, lo cual cambia el traslado a `"habitacion"`.

- **Soporte en Backend**: Este flujo puede usar el endpoint existente `PATCH /pedidos/:id`, pero el servidor debe permitir modificar en un solo patch:
  ```json
  {
    "tipoTraslado": "habitacion",
    "estado": "solicitado",
    "avisoPendiente": "sintraslado"
  }
  ```

---

## 3. Actualización de la Capa de Servicios (`cliente-web/src/services/api.ts`)

Para que el frontend pueda consumir los nuevos endpoints descritos en la sección 2, se deben agregar y exportar los siguientes métodos en el archivo de servicios del cliente web:

```typescript
// Implementación recomendada para añadir en cliente-web/src/services/api.ts

export const acuseReciboEmergencia = async (id: string, userId: string): Promise<Pedido> => {
  const { data } = await api.patch(`/pedidos/${id}/vista`, { userId });
  return data;
};

export const updateUbicacionInternacion = async (internacionId: string, cama: string, sector?: string): Promise<any> => {
  const { data } = await api.patch(`/internaciones/${internacionId}/ubicacion`, { cama, sector });
  return data;
};
```

---

## 4. Sincronización del Seed de Datos (`server/src/data/seed.ts`)

Cuando el administrador ejecuta el reinicio de demostración mediante `POST /reset`, el servidor regenera la base en memoria utilizando el script `seed.ts`.

### Modificaciones Recomendadas para el Script de Semillas:
1. **Padrón Hospitalario y Sectores**: Asegurar que las listas estáticas del backend coincidan 1 a 1 con el arreglo `SECTORES` y `PADRON_HOSPITAL` del v30.
2. **Pedidos de Muestra con Alarma Activa**: En la lista inicial del seed del servidor, incluir al menos un pedido con `prioridad: "urgente"` que tenga `emergenciaVista: null` o `undefined`, para que al iniciar sesión en el cliente web se demuestre de inmediato el funcionamiento de la alarma sonora de código rojo.
