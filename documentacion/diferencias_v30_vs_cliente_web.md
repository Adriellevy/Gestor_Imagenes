# Informe Exhaustivo de Auditoría: Worklist v30 vs. Cliente Web (Frontend)

Este documento constituye el informe técnico y catálogo completo de diferencias encontradas entre el prototipo monolítico **`worklist-imagenes-v30.jsx`** (definido por el usuario como la **fuente de verdad** funcional y de negocio) y el proyecto modular en TypeScript/Vite **`cliente-web`**.

Las discrepancias se encuentran organizadas en 4 dominios arquitectónicos, presentando una tabla comparativa detallada y las recomendaciones exactas para alinear el código de producción.

---

## 1. Dominio de Modelos de Datos, Tipos y Constantes

En este dominio se evaluaron los esquemas estáticos, catálogos y diccionarios ubicados en `constants.ts`, `types/index.ts` y `helpers.ts`.

| Componente / Atributo | Implementación en `worklist-imagenes-v30.jsx` | Implementación en `cliente-web` | Impacto y Recomendación de Corrección |
| :--- | :--- | :--- | :--- |
| **Umbrales de Demora** (`PRIORITIES.urgente`) | `umbralRojo: 30`<br>`umbralAlerta: 10` | `umbralRojo: 10`<br>`umbralAlerta: 30` | **Crítico (Invertido)**: En el cliente web, los umbrales de minutos para disparar el color rojo y la alerta en código rojo están al revés. Se debe corregir `constants.ts` para asignar 30 min al rojo y 10 min a la alerta. |
| **Etiqueta de Prioridad** (`PRIORITIES.normal`) | `label: "En internación"`<br>`short: "En internación"` | `label: "Normal"`<br>`short: "Normal"` | **Moderado**: Inconsistencia visual en tarjetas y reportes. Cambiar en `constants.ts` a `"En internación"`. |
| **Casos Código Rojo** (`CASOS_CODIGO_ROJO`) | 6 casos totales. Incluye:<br>1. *Rx de tórax* (Neumotórax, en habitación)<br>2. *Ecocardiograma* (Taponamiento, en habitación) | 4 casos totales (solo TEP, Síndrome aórtico y ACV en TC/RM). | **Alto**: El cliente web no permite seleccionar como código rojo las urgencias de Neumotórax ni Taponamiento en el modal de pedido. Se deben agregar a `constants.ts`. |
| **Diccionario de Estados** (`STATUS`) | 6 estados:<br>`autorizacion_pendiente`, `solicitado`, `traslado_solicitado`, `en_proceso`, `realizado`, `cancelado`. | 7 estados:<br>Incluye el estado adicional `"traslado_retorno"` (Retorno solicitado, rank 2.5). | **Estructural**: El cliente web introdujo un estado intermedio para solicitar retorno al piso. Se debe decidir si mantenerlo como evolución o removerlo para mantener paridad estricta con v30. |
| **Nomenclatura de Rol** (`ROLES.tecnico`) | `label: "Personal de imágenes"` | `label: "Técnico de imágenes"` | **Menor**: Alinear texto en `ROLES.tecnico.label` a `"Personal de imágenes"`. |
| **Propiedades de Pedido** (`Pedido.emergenciaVista`) | Define `emergenciaVista: { ts: number, por: string }` para registrar cuándo el sector de imágenes acusó recibo de un código rojo. | **No existe** en la interfaz `Pedido` ni en el store. | **Crítico**: Sin este campo, el cliente web carece del mecanismo de acuse de recibo de emergencias rojas. |
| **Hidratación de Paciente** (`hidratar`) | El objeto `_paciente` incluye el campo `fechaNacimiento: string \| null`. | El objeto `_paciente` no incluye `fechaNacimiento`. | **Menor**: Agregar `fechaNacimiento` en el objeto hidratado en `helpers.ts` para uso en etiquetas o QR. |

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
| **Alerta Sonora de Emergencia** (`beepEmergencia`) | Sintetiza un triple tono de alarma (880Hz / 1245Hz) usando `window.AudioContext` cuando hay pedidos de código rojo sin acuse de recibo (`!s.emergenciaVista`). | **Ausente completamente**: No existe la función ni se dispara ningún sonido cuando entra un código rojo. | **Crítico**: La sala de imágenes o guardia necesita la alarma sonora para actuar de inmediato. Se debe importar o recrear `beepEmergencia()` en `helpers.ts` y llamarla en un efecto en `App.tsx` o `Header.tsx`. |
| **Acuse de Recibo Código Rojo** (`marcarVista`) | El ayudante o técnico hace clic en "Visto" en la tarjeta de urgencia, lo que muta el pedido y fija `emergenciaVista: { ts: Date.now(), por: currentUserId }`. | **Ausente**: No existe el manejador `onMarcarVista` en `App.tsx` ni en las tarjetas. | **Crítico**: Incorporar la acción en Zustand (`cambiarEmergenciaVista`) y conectarla en la UI. |
| **Cambio en Caliente de Cama** (`actualizarCama`) | Permite a cualquier usuario editar la cama del paciente internado directamente desde la tarjeta de estudio sin abrir el modal completo. | **Ausente**: No se pasa el callback `onActualizarCama` en `App.tsx` ni en las vistas. | **Moderado**: Añadir una acción `updateUbicacionInternacion(internacionId, cama)` en el store de Zustand. |
| **Paginación de Estudios Terminados** | No implementa paginación explícita (mantiene todo el array en memoria). | Implementa un mecanismo optimizado de paginación infinita en Zustand (`pedidosTerminados`, `fetchNextPageTerminados`). | **Evolución positiva**: Se recomienda mantener la paginación del cliente web ya que es una mejora arquitectónica necesaria para escalabilidad y rendimiento en producción. |
| **Formato de Mensaje WhatsApp** (`mensajeTraslado`) | Antepone el encabezado `🔴 CÓDIGO ROJO - URGENCIA` al texto del mensaje si la prioridad del estudio es `urgente`. | No incluye el encabezado de alerta roja en el string generado para WhatsApp. | **Alto**: Los camilleros o camillería central no distinguen inmediatamente la urgencia al abrir el enlace de WhatsApp. Actualizar en `helpers.ts`. |

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
| **Tablero de Aeropuerto** (`BoardView`) | Muestra ícono de hospital (`<Hospital size={22} />`) y título `"Imágenes — Cola de estudios"`. | Muestra el logo institucional (`Logo Suma_Care.png`) y el título `"Suma Care — Cola de estudios"`. Incluye el estado `"RETORNO SOLICITADO"`. | **Estético / Marca**: El cambio a Suma Care es una personalización del cliente. Se recomienda mantenerlo, pero verificar el filtrado de estados según si se aprueba o no el estado de retorno. |
| **Vista Clínica** (`ClinicalSection`) | Recibe e integra `actualizarCama` para permitir reubicar al paciente en sala desde la lista. | No recibe la prop `onActualizarCama` ni la propaga a las tarjetas de estudio. | **Moderado**: Conectar la prop faltante para evitar que el médico tenga que cancelar un pedido si el paciente cambió de cama. |
| **Dashboard y Analítica** (`DashboardView`) | Incluye botón y función nativa `exportarCSV()` para descargar las métricas de tiempos y esperas en archivo `.csv`. | Incluye el botón de exportar CSV e incorpora gráficos visuales de pastel (`Recharts`) para distribución por Obra Social y filtros por rango de fechas. | **Evolución positiva**: El cliente web mejoró significativamente el panel con librerías de gráficos e historiales. Ambos coinciden en la exportación CSV. |

---

## 4. Dominio de Componentes de Estudios y Modales (`StudyCard` y `AddStudyModal`)

| Componente | Implementación en `worklist-imagenes-v30.jsx` | Implementación en `cliente-web` | Impacto y Recomendación de Corrección |
| :--- | :--- | :--- | :--- |
| **Tarjeta de Estudio** (`StudyCard`) | Muestra botón interactivo **"Visto"** pulsante en color rojo cuando `study.prioridad === "urgente" && !study.emergenciaVista`. Muestra botón de edición rápida de cama al lado de la ubicación. | **Ausente**: No cuenta con el botón de acuse de recibo para emergencias ni con la edición rápida de cama. | **Crítico**: Modificar `StudyCard.tsx` para recibir y renderizar los botones de `onMarcarVista` y `onActualizarCama`. |
| **Modal de Pedido** (`AddStudyModal`) | Soporta selección de aislamiento, orden médica, camas de guardia y casos rojos precargados de Neumotórax y Taponamiento. | Soporta los campos de formulario correctos, pero carece de las dos opciones de código rojo en habitación por la carencia en `constants.ts`. | **Resuelto automáticamente**: Al aplicar el diff recomendado en la Sección 1 (`CASOS_CODIGO_ROJO`), el modal de pedido ganará automáticamente estas funcionalidades. |
| **Generador de QR** (`QrModal`) | Renderiza un SVG del QR en línea e instrucciones de impresión con datos del paciente. | Implementa un modal modular similar, empaquetando la lógica en `QrModal.tsx`. | **Paridad completa**: El comportamiento y datos codificados coinciden satisfactoriamente. |

---

## Conclusión y Próximos Pasos para Frontend

El proyecto `cliente-web` posee una arquitectura de calidad industrial superior al monolito, pero ha sufrido **desviaciones en reglas de negocio críticas** introducidas en la versión 30:
1. Corregir urgentemente los umbrales de tiempo invertidos de `PRIORITIES` en `constants.ts`.
2. Reintegrar la alarma sonora de urgencia (`beepEmergencia`) y el acuse de recibo en las tarjetas de estudio (`emergenciaVista`).
3. Añadir las opciones faltantes de código rojo en habitación y el encabezado de WhatsApp.
