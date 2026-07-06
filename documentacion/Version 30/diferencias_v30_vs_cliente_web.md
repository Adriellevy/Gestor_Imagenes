# Informe Exhaustivo de Auditoría: Worklist v30 vs. Cliente Web vs. Backend NestJS

Este documento constituye el informe técnico, catálogo completo de diferencias y guía de alineación arquitectónica entre el prototipo monolítico **`worklist-imagenes-v30.jsx`** (fuente de verdad funcional y operativa), el proyecto modular en TypeScript/React **`cliente-web`** y la capa de servicios backend en NestJS (**`server`**).

Las discrepancias se encuentran organizadas en **5 dominios arquitectónicos**, presentando tablas comparativas detalladas, hallazgos de auditoría real del backend y las recomendaciones exactas para alinear el código de producción.

---

## 1. Dominio de Modelos de Datos, Tipos y Constantes

En este dominio se evaluaron los esquemas estáticos, catálogos y diccionarios ubicados en `constants.ts`, `types/index.ts` y `helpers.ts`, contrastándolos con el backend.

| Componente / Atributo | Implementación en `worklist-imagenes-v30.jsx` | Implementación en `cliente-web` | Impacto y Recomendación de Corrección |
| :--- | :--- | :--- | :--- |
| **Umbrales de Demora** (`PRIORITIES.urgente`) | `umbralRojo: 30`<br>`umbralAlerta: 10` | `umbralRojo: 10`<br>`umbralAlerta: 30` | **Crítico (Invertido)**: En el cliente web, los umbrales de minutos para disparar el color rojo y la alerta están al revés. Corregir `constants.ts` asignando 30 min al rojo y 10 min a la alerta. |
| **Etiqueta de Prioridad** (`PRIORITIES.normal`) | `label: "En internación"`<br>`short: "En internación"` | `label: "Normal"`<br>`short: "Normal"` | **Moderado**: Inconsistencia visual en tarjetas y reportes. Cambiar en `constants.ts` a `"En internación"`. |
| **Casos Código Rojo** (`CASOS_CODIGO_ROJO`) | 6 casos totales. Incluye:<br>1. *Rx de tórax* (Neumotórax)<br>2. *Ecocardiograma* (Taponamiento) | 4 casos totales (solo TEP, Síndrome aórtico y ACV en TC/RM). | **Alto**: El cliente web no permite seleccionar como código rojo las urgencias de Neumotórax ni Taponamiento. Agregar a `constants.ts`. |
| **Diccionario de Estados** (`STATUS`) | 6 estados:<br>`autorizacion_pendiente`, `solicitado`, `traslado_solicitado`, `en_proceso`, `realizado`, `cancelado`. | 7 estados:<br>Incluye el estado adicional `"traslado_retorno"` (Retorno solicitado, rank 2.5). | **Estructural / Operativo**: El cliente web introdujo un estado intermedio para solicitar retorno al piso. Se recomienda mantenerlo en producción por su valor para camillería. |
| **Nomenclatura de Rol** (`ROLES.tecnico`) | `label: "Personal de imágenes"` | `label: "Técnico de imágenes"` | **Menor**: Alinear texto en `ROLES.tecnico.label` a `"Personal de imágenes"`. |
| **Propiedades de Pedido** (`Pedido.emergenciaVista`) | Define `emergenciaVista: { ts: number, por: string }` para registrar cuándo el sector acusó recibo. | **No existe** en la interfaz `Pedido` ni en el store. | **Crítico**: Sin este campo en el frontend ni en el backend, el sistema carece de trazabilidad para emergencias rojas. |
| **Hidratación de Paciente** (`hidratar`) | El objeto `_paciente` incluye el campo `fechaNacimiento: string \| null`. | El objeto `_paciente` no incluye `fechaNacimiento`. | **Menor**: Agregar `fechaNacimiento` en el objeto hidratado en `helpers.ts` para etiquetas o código QR. |

### Diffs Recomendados en `cliente-web/src/utils/constants.ts`

```diff
 export const ROLES = {
   medico: { label: "Médico solicitante", color: "#2563eb", permisos: ["pedir_estudio", "cancelar_pedido", "ver_servicio", "ver_imagenes"] },
-  tecnico: { label: "Técnico de imágenes", color: "#0d9488", permisos: ["iniciar", "finalizar", "retroceder", "ver_imagenes"] },
+  tecnico: { label: "Personal de imágenes", color: "#0d9488", permisos: ["iniciar", "finalizar", "retroceder", "ver_imagenes"] },
   administrativo: { label: "Administrativo", color: "#ea580c", permisos: ["autorizar", "ver_imagenes"] },
   admin: { label: "Admin general", color: "#7c3aed", permisos: Object.keys(PERMISOS) },
 };

 export const PRIORITIES: Record<string, any> = {
-  urgente: { label: "Urgente - código rojo", short: "Código rojo", badge: "bg-red-50 text-red-700 border-red-200", bar: "#dc2626", rank: 0, umbralRojo: 10, umbralAlerta: 30 },
+  urgente: { label: "Urgente - código rojo", short: "Código rojo", badge: "bg-red-50 text-red-700 border-red-200", bar: "#dc2626", rank: 0, umbralRojo: 30, umbralAlerta: 10 },
   prioritario: { label: "Prioridad", short: "Prioridad", badge: "bg-amber-50 text-amber-700 border-amber-200", bar: "#d97706", rank: 1, umbralRojo: 120, umbralAlerta: 120 },
-  normal: { label: "Normal", short: "Normal", badge: "bg-slate-100 text-slate-600 border-slate-200", bar: "#cbd5e1", rank: 2, umbralRojo: null, umbralAlerta: null },
+  normal: { label: "En internación", short: "En internación", badge: "bg-slate-100 text-slate-600 border-slate-200", bar: "#cbd5e1", rank: 2, umbralRojo: null, umbralAlerta: null },
 };

 export const CASOS_CODIGO_ROJO = [
   { modalidad: "tc", dx: "TEP", estudio: "Angiotomografía de tórax (protocolo TEP)", conContraste: true },
   { modalidad: "tc", dx: "Síndrome aórtico", estudio: "Angiotomografía de aorta", conContraste: true },
   { modalidad: "tc", dx: "ACV", estudio: "Angiotomografía de encéfalo (vasos intra y extracraneanos)", conContraste: true },
   { modalidad: "rm", dx: "ACV", estudio: "RMN de encéfalo (protocolo stroke)", conContraste: false },
+  { modalidad: "rx", dx: "Neumotórax", estudio: "Rx de tórax", conContraste: false, tipoTraslado: "habitacion" },
+  { modalidad: "ecocardio", dx: "Sospecha de taponamiento", estudio: "Ecocardiograma de urgencia (descartar taponamiento)", conContraste: false, tipoTraslado: "habitacion" },
 ];
```

---

## 2. Dominio de Arquitectura, Estado y Flujo Operativo (`useStore.ts` y `App.tsx`)

| Funcionalidad / Mecanismo | Implementación en `worklist-imagenes-v30.jsx` | Implementación en `cliente-web` (`App.tsx` / `useStore.ts`) | Impacto y Recomendación de Corrección |
| :--- | :--- | :--- | :--- |
| **Alerta Sonora de Emergencia** (`beepEmergencia`) | Sintetiza un triple tono de alarma (880Hz / 1245Hz) usando `window.AudioContext` cuando hay pedidos urgentes sin acuse (`!s.emergenciaVista`). | **Ausente completamente**: No existe la función ni se dispara ningún sonido. | **Crítico**: La sala de imágenes o guardia necesita la alarma sonora para actuar de inmediato. Recrear `beepEmergencia()` en `helpers.ts` y llamarla en un efecto en `App.tsx`. |
| **Acuse de Recibo Código Rojo** (`marcarVista`) | El técnico hace clic en "Visto" en la tarjeta de urgencia, fijando `emergenciaVista: { ts: Date.now(), por: currentUserId }`. | **Ausente**: No existe el manejador `onMarcarVista` en `App.tsx` ni en el store. | **Crítico**: Incorporar la acción asíncrona en Zustand (`cambiarEmergenciaVista`) y conectarla con la API de NestJS. |
| **Cambio en Caliente de Cama** (`actualizarCama`) | Permite a cualquier usuario editar la cama del paciente internado desde la tarjeta de estudio sin abrir el modal completo. | **Ausente**: No se pasa el callback `onActualizarCama` en `App.tsx` ni en las vistas. | **Moderado**: Añadir una acción `updateUbicacionInternacion(internacionId, cama)` en Zustand, invocando al nuevo endpoint del backend. |
| **Paginación de Estudios Terminados** | No implementa paginación explícita (mantiene todo el array en memoria). | Implementa paginación infinita en Zustand (`pedidosTerminados`, `fetchNextPageTerminados`). | **Evolución positiva**: Se recomienda mantener la paginación del cliente web para garantizar escalabilidad en producción. |
| **Formato de Mensaje WhatsApp** (`mensajeTraslado`) | Antepone el encabezado `🔴 CÓDIGO ROJO - URGENCIA` al texto del mensaje si la prioridad del estudio es `urgente`. | No incluye el encabezado de alerta roja en el string generado para WhatsApp. | **Alto**: Los camilleros no distinguen la urgencia de inmediato. Actualizar en `helpers.ts`. |

### Diffs Recomendados en `cliente-web/src/utils/helpers.ts`

```diff
 export function mensajeTraslado(study: any, tipo = "ida", hermanos: any[] = []) {
   const imagenes = typeMeta(study.modalidad)?.label ?? "Imágenes";
   const ubic = `${study._servicio} - ${study._paciente?.cama}`;
   const tr = TRASLADOS[study.tipoTraslado]?.label ?? "—";
   const paciente = `Paciente: ${study._paciente?.nombreCompleto} (HC ${study._paciente?.hc})`;
   const vuelta = tipo === "vuelta";
   const lineas =
     tipo === "cancel"      ? ["TRASLADO CANCELADO", paciente, `Ubicación: ${ubic}`, "Estudio suspendido."] :
     tipo === "sintraslado" ? ["TRASLADO CANCELADO", paciente, `Ubicación: ${ubic}`, "El estudio se realizará sin traslado (en cama/habitación)."] :
     tipo === "modif"       ? ["TRASLADO MODIFICADO", paciente, `Ubicación: ${ubic}`, `Nuevo medio: ${tr}`] :
     [
       vuelta ? "Solicitud de traslado (regreso a origen)" : "Solicitud de traslado",
       paciente,
       ...(study.aislamiento ? ["AISLAMIENTO: requiere precauciones (traer EPP)."] : []),
       ...(vuelta ? [`Desde: ${imagenes}`, `Hacia: ${ubic}`] : [`Origen: ${ubic}`, `Destino: ${imagenes}`]),
       `Traslado: ${tr}`,
       `Estudio: ${study.descripcion}${vuelta ? " (finalizado)" : ""}`,
       ...(!vuelta && hermanos && hermanos.length ? [`Otros estudios del paciente: ${hermanos.map((h: any) => `${typeMeta(h.modalidad)?.short || h.modalidad} ${h.descripcion}`).join("; ")}`] : []),
       `Prioridad: ${PRIORITIES[study.prioridad]?.label}`,
     ];
-  return lineas.join("\n");
+  const cuerpo = lineas.join("\n");
+  return study.prioridad === "urgente" ? `🔴 CÓDIGO ROJO - URGENCIA\n\n${cuerpo}` : cuerpo;
 }
```

---

## 3. Dominio de Vistas Principales y Tableros

| Componente / Vista | Implementación en `worklist-imagenes-v30.jsx` | Implementación en `cliente-web` | Impacto y Recomendación de Corrección |
| :--- | :--- | :--- | :--- |
| **Tablero de Aeropuerto** (`BoardView`) | Muestra ícono de hospital (`<Hospital />`) y título `"Imágenes — Cola de estudios"`. | Muestra el logo institucional (`Logo Suma_Care.png`) y el título `"Suma Care — Cola de estudios"`. Incluye el estado `"RETORNO SOLICITADO"`. | **Estético / Marca**: Mantener personalización de Suma Care y verificar el filtrado de estados en pantalla grande. |
| **Vista Clínica** (`ClinicalSection`) | Recibe e integra `actualizarCama` para reubicar al paciente en sala desde la lista. | No recibe la prop `onActualizarCama` ni la propaga a las tarjetas de estudio. | **Moderado**: Conectar la prop faltante para evitar tener que cancelar un pedido si el paciente cambió de cama. |
| **Dashboard y Analítica** (`DashboardView`) | Incluye botón y función nativa `exportarCSV()` para descargar las métricas de tiempos. | Incluye botón de exportar CSV e incorpora gráficos de pastel (`Recharts`) para distribución por Obra Social y filtros de fecha. | **Evolución positiva**: El cliente web mejoró significativamente el panel con librerías de gráficos. |

---

## 4. Dominio de Componentes de Estudios y Modales (`StudyCard` y `AddStudyModal`)

| Componente | Implementación en `worklist-imagenes-v30.jsx` | Implementación en `cliente-web` | Impacto y Recomendación de Corrección |
| :--- | :--- | :--- | :--- |
| **Tarjeta de Estudio** (`StudyCard`) | Muestra botón interactivo **"Visto"** pulsante en color rojo cuando `study.prioridad === "urgente" && !study.emergenciaVista`. Muestra botón de edición rápida de cama. | **Ausente**: No cuenta con el botón de acuse de recibo para emergencias ni con la edición rápida de cama. | **Crítico**: Modificar `StudyCard.tsx` para recibir y renderizar los botones de `onMarcarVista` y `onActualizarCama`. |
| **Modal de Pedido** (`AddStudyModal`) | Soporta aislamiento, orden médica, camas de guardia y casos rojos precargados. | Soporta los campos correctos, pero carece de las dos opciones de código rojo en habitación por la carencia en `constants.ts`. | **Resuelto automáticamente**: Al aplicar el diff recomendado en la Sección 1 (`CASOS_CODIGO_ROJO`), el modal ganará automáticamente estas opciones. |
| **Generador de QR** (`QrModal`) | Renderiza un SVG del QR en línea e instrucciones de impresión con datos del paciente. | Implementa un modal modular similar en `QrModal.tsx`. | **Paridad completa**: El comportamiento y datos codificados coinciden satisfactoriamente. |

---

## 5. Dominio de Integración Frontend-Backend (Capas API y Store)

Para lograr que las funcionalidades visuales y operativas se sincronicen de manera robusta y persistente con el servidor NestJS, se debe establecer un puente bidireccional en la capa HTTP ([api.ts](file:///c:/Users/adrie/OneDrive/Escritorio/Suma%20Care/Gestor_Imagenes/cliente-web/src/services/api.ts)) y en el gestor de estado global ([useStore.ts](file:///c:/Users/adrie/OneDrive/Escritorio/Suma%20Care/Gestor_Imagenes/cliente-web/src/store/useStore.ts)).

> [!IMPORTANT]
> **Sincronización Asíncrona con NestJS**: En el prototipo monolítico v30, las acciones `marcarVista` y `actualizarCama` operan directamente en memoria sobre el estado de React. En el cliente web, estas acciones **deben transformarse en operaciones asíncronas** que muten el store local mediante actualizaciones optimistas (`optimistic updates`) o re-hidratación, enviando en paralelo peticiones `PATCH` a los endpoints REST del servidor.

### 5.1 Nuevos Contratos HTTP en `cliente-web/src/services/api.ts`

El cliente web deberá añadir las siguientes exportaciones para comunicarse con los nuevos endpoints especificados en [cambios_requeridos_backend.md](file:///c:/Users/adrie/OneDrive/Escritorio/Suma%20Care/Gestor_Imagenes/documentacion/Version%2030/cambios_requeridos_backend.md):

* **Acuse de recibo en servidor**:
  ```typescript
  export const acuseReciboEmergencia = async (id: string, userId: string): Promise<Pedido> => {
    const { data } = await api.patch(`/pedidos/${id}/vista`, { userId });
    return data;
  };
  ```
* **Actualización de cama y sector en servidor**:
  ```typescript
  export const updateUbicacionInternacion = async (internacionId: string, cama: string, sector?: string): Promise<any> => {
    const { data } = await api.patch(`/internaciones/${internacionId}/ubicacion`, { cama, sector });
    return data;
  };
  ```

### 5.2 Mutaciones en Store Global (`cliente-web/src/store/useStore.ts`)

Se deben incorporar dos acciones al contrato del store en Zustand:

1. `cambiarEmergenciaVista: async (id: string) => void`:
   * **Flujo**: Identifica el pedido en `pedidosActivos`, asigna localmente `emergenciaVista = { ts: Date.now(), por: usuario.id }` para apagar la alarma de inmediato, y ejecuta en segundo plano `api.acuseReciboEmergencia(id, usuario.id)`.
2. `updateUbicacionInternacion: async (internacionId: string, cama: string, sector?: string) => void`:
   * **Flujo**: Modifica la cama en el arreglo de `internaciones` del store, recalcula la propiedad hidratada `_paciente.cama` en las tarjetas visibles, y realiza la llamada `api.updateUbicacionInternacion(internacionId, cama, sector)`.

---

## 6. Conclusión y Próximos Pasos para Ejecución

Este informe, en conjunto con [cambios_requeridos_backend.md](file:///c:/Users/adrie/OneDrive/Escritorio/Suma%20Care/Gestor_Imagenes/documentacion/Version%2030/cambios_requeridos_backend.md), conforma el marco técnico contextual de referencia obligatoria para proceder con la ejecución de cambios de código en el repositorio.

### Hoja de Ruta Inmediata:
1. **Fase Servidor (NestJS)**: Añadir `emergenciaVista` en entidades y crear los dos endpoints REST de acuse y reubicación de camas.
2. **Fase Servicios y Store (Frontend)**: Integrar las llamadas en `api.ts` y exponer las acciones en `useStore.ts`.
3. **Fase UI e Interactividad (Frontend)**: Conectar la alarma sonora `beepEmergencia()` en `App.tsx` y renderizar los botones de "Visto" y edición de cama en `StudyCard.tsx`.
