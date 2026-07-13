# Documento Institucional de Requerimientos de Integración Hospitalaria (HIS / EHR / RIS)

**Plataforma:** Suma Care — Gestor de Imágenes y Worklist Hospitalaria  
**Versión de Especificación:** 3.0  
**Destinatarios:** Dirección Médica, Jefaturas de Radiología y Departamento de Sistemas / TI  
**Fecha de Emisión:** Julio 2026  

---

## 1. Introducción y Resumen Ejecutivo

El presente documento establece los requerimientos funcionales, arquitectónicos y técnicos necesarios para la correcta integración entre el Sistema de Gestión Hospitalaria (HIS / EHR / RIS actual de la institución) y la plataforma **Suma Care (Gestor de Imágenes y Worklist Radiológica)**.

El objetivo primordial es dotar al personal médico, técnicos radiólogos, administrativos y camilleros de un flujo de trabajo ágil y coordinado, eliminando la doble carga manual de pacientes y órdenes, previniendo errores de identificación en sala y garantizando una logística hospitalaria de excelencia, especialmente ante situaciones críticas de urgencia médica (**Códigos Rojos**).

### 1.1 Principio Fundacional: Arquitectura 100% de Solo Lectura (Read-Only)

Desde la perspectiva de los sistemas institucionales del hospital, la integración se diseña bajo un modelo estrictamente unidireccional y de **Solo Lectura (Read-Only)**:

> [!IMPORTANT]
> **GARANTÍA DE NO INTRUSIÓN ARQUITECTÓNICA**  
> **Suma Care NO modificará, NO escribirá, ni emitirá notificaciones o cambios de estado de vuelta hacia las bases de datos o la Historia Clínica Electrónica (HCE) del hospital.** Nuestra plataforma funciona como un motor de optimización del workflow logístico interno de radiología, alimentándose de los datos asistenciales para coordinar la operativa en nuestra propia interfaz.

Esta decisión arquitectónica elimina cualquier riesgo de corrupción de datos clínicos institucionales, simplifica las auditorías de bioseguridad y seguridad informática, y reduce drásticamente el tiempo de implementación requerido por parte del equipo de Sistemas / TI.

### 1.2 Estrategia de Coexistencia y Autenticación Híbrida

Para facilitar la adopción inmediata por parte del staff médico y técnico sin imponer la barrera de recordar nuevas contraseñas, Suma Care implementa un modelo de seguridad dual e integrado:

* **Usuarios Institucionales (Personal Hospitalario):** Los médicos solicitantes, técnicos de radiología y personal administrativo ingresarán al sistema utilizando exactamente sus mismos usuarios y credenciales institucionales actuales. Esto se logra validando de forma transparente contra el servicio de directorio del hospital (SSO / Active Directory / LDAP / Token federado).
* **Usuarios Propios (Administradores Suma Care):** Coexistiendo en perfecta armonía, el sistema mantiene una estrategia de autenticación local en nuestra base de datos para que el equipo de soporte técnico y administración de Suma Care pueda loguearse y gestionar el servidor sin interferir con el directorio del hospital.

Ambas estrategias operan de manera simultánea en la aplicación web, garantizando que no exista ninguna diferencia de experiencia o funcionalidad entre un usuario autenticado vía directorio y uno local.

### 1.3 Enfoque Pragmático en Demografía Básica

Con el fin de agilizar el desarrollo de las interfaces de ingesta por parte del equipo técnico hospitalario, se ha decidido excluir del alcance obligatorio cualquier parámetro clínico complejo o invasivo (tal como peso, altura, signos vitales o historial de alergias). El sistema solicitará estrictamente la información demográfica, logística y de prescripción básica necesaria para operar eficientemente la cola de estudios y la camillería.

---

## 2. Catálogo Operativo de Módulos de Ingesta (Solo Lectura)

La información requerida desde el hospital hacia Suma Care se organiza en cuatro grandes módulos funcionales. A continuación se detalla cada módulo, su justificación operativa en la sala de imágenes y la especificación de los campos necesarios.

### 2.1 Módulo I: Identificación y Demografía de Pacientes

Permite poblar automáticamente las tarjetas de estudio (`StudyCard`) en la cola de trabajo, generar pulseras y etiquetas de identificación con código QR para bioseguridad del paciente y segmentar las estadísticas operativas del servicio según la cobertura médica.

| Campo Requerido | Nombre Estándar / Atributo | Tipo de Dato | Obligatoriedad | Uso Operativo en Suma Care |
| :--- | :--- | :--- | :--- | :--- |
| **ID de Paciente** | `patientId` / `MPI` | String / UUID | **Requerido** | Clave primaria única de vinculación institucional. |
| **Historia Clínica** | `hc` / `MRN` | String (Alfanum.) | **Requerido** | Identificador clínico visual en listas y reportes. |
| **Documento** | `documento (tipo/numero)` | Objeto JSON | **Requerido** | DNI, Pasaporte o Libreta de Enrolamiento para verificación. |
| **Apellidos y Nombres** | `apellido`, `nombre` | String | **Requerido** | Identificación inequívoca del paciente en pantallas y pulseras. |
| **Fecha de Nacimiento** | `fechaNacimiento` | String (`YYYY-MM-DD`) | **Requerido** | Cálculo automático de edad para protocolos pediátricos vs. adultos. |
| **Sexo / Género** | `sexo` | String (`M`/`F`/`O`) | **Requerido** | Asignación de parámetros radiológicos y metadatos DICOM. |
| **Obra Social / Seguro** | `obraSocial` | String | **Requerido** | Gestión administrativa y filtros analíticos en el Dashboard. |

---

### 2.2 Módulo II: Internaciones, Guardia y Camas en Tiempo Real

Este módulo es el corazón logístico de la plataforma. La certeza en la ubicación en tiempo real del paciente evita que los camilleros realicen viajes fallidos a habitaciones equivocadas, permite el traslado de cama en pantalla en caliente y alerta al personal sobre medidas de bioseguridad.

> [!WARNING]
> **CRITICIDAD OPERATIVA DE LA CAMA EN TIEMPO REAL**  
> En un hospital dinámico, un paciente puede ser trasladado de Guardia a Piso o de Clínica a Unidad de Cuidados Intensivos mientras su estudio de imágenes está en cola. **Si el sistema no recibe la habitación y cama actualizada, el camillero perderá en promedio entre 15 y 25 minutos buscando al paciente**, retrasando toda la agenda del resonador o tomógrafo.

| Campo Requerido | Nombre Estándar / Atributo | Tipo de Dato | Obligatoriedad | Uso Operativo en Suma Care |
| :--- | :--- | :--- | :--- | :--- |
| **ID de Internación** | `internacionId` / `encounterId` | String / UUID | **Requerido** | Identificador único del encuentro hospitalario actual. |
| **Servicio / Especialidad** | `servicioId` | String | **Requerido** | Sector clínico de origen (ej. Guardia, UTI, Clínica Médica). |
| **Sector / Sala** | `ubicacion.sector` | String | **Requerido** | Área arquitectónica dentro del edificio hospitalario. |
| **Habitación y Cama** | `ubicacion.habitacion`, `cama` | String | **Requerido** | Ubicación exacta para logística de camillería en tiempo real. |
| **Estado de Internación** | `estado` | String | **Requerido** | Activa, Trasladado o Alta médica (purgado automático de cola). |
| **Requiere Aislamiento** | `aislamiento` | Boolean | **Requerido** | Alerta para uso obligatorio de EPP (barbijo N95/camisolín). |

---

### 2.3 Módulo III: Solicitudes y Órdenes de Estudio (Worklist)

Recibe las prescripciones emitidas por los médicos en la Historia Clínica del hospital y las transforma en tarjetas interactivas en el tablero aeroportuario de imágenes, categorizando por prioridad, modalidad y requerimiento de transporte.

| Campo Requerido | Nombre Estándar / Atributo | Tipo de Dato | Obligatoriedad | Uso Operativo en Suma Care |
| :--- | :--- | :--- | :--- | :--- |
| **ID de la Orden / Pedido** | `orderId` / `accessionNumber` | String | **Requerido** | Clave única de la orden médica para trazabilidad. |
| **Modalidad Solicitada** | `modalidad` | String | **Requerido** | `rx`, `tc`, `rm`, `eco`, `ecocardio` o equipos portátiles. |
| **Descripción del Estudio** | `descripcion` | String | **Requerido** | Nombre formal del estudio (ej. *Angiotomografía de tórax*). |
| **Región y Lateralidad** | `regionAnatomica`, `lateralidad` | String | **Requerido** | Zona anatómica y lateralidad (*Derecha*, *Izquierda*, *Bilateral*). |
| **Indicación Clínica** | `motivo` / `dx` | String (Texto) | **Requerido** | Diagnóstico presuntivo o motivo clínico de la solicitud. |
| **Requiere Contraste** | `conContraste` | Boolean | **Requerido** | Alerta para preparación de vía periférica previa al estudio. |
| **Prioridad Clínica** | `prioridad` | String | **Requerido** | `normal` (Internación), `prioritario` o `urgente` (Código Rojo). |
| **Tipo de Traslado** | `tipoTraslado` | String | **Requerido** | `cama`, `camilla`, `silla`, `ambulatorio` o en habitación (portátil). |
| **Orden Adjunta** | `ordenMedica` | Objeto JSON | *Opcional* | Datos o enlace al documento de prescripción digitalizada. |

---

### 2.4 Módulo IV: Directorio de Personal y Autenticación Híbrida

Garantiza que cada orden esté legalmente avalada por un médico matriculado, permite que el staff ingrese sin nuevas contraseñas y registra la auditoría de seguridad cuando un profesional acusa recibo de una alarma sonora de emergencia (campo `emergenciaVista`).

| Campo Requerido | Nombre Estándar / Atributo | Tipo de Dato | Obligatoriedad | Uso Operativo en Suma Care |
| :--- | :--- | :--- | :--- | :--- |
| **ID de Usuario** | `userId` / `username` | String | **Requerido** | Nombre de usuario o ID en el directorio del hospital (AD/LDAP). |
| **Nombre Completo** | `nombre` | String | **Requerido** | Nombre y apellido del profesional para mostrar en interfaz. |
| **Matrícula Profesional** | `matricula` | String | **Requerido** | Matrícula médica para validez legal de las prescripciones. |
| **Servicio / Especialidad** | `servicio` | String | **Requerido** | Especialidad o departamento asistencial al que pertenece. |
| **Rol Operativo** | `rol` | String | **Requerido** | `medico`, `tecnico` (personal de imágenes), `administrativo`, `admin`. |

---

## 3. Especificaciones Técnicas y API REST (Para Sistemas / TI)

Para maximizar la simplicidad de la integración y evitar que el hospital deba implementar protocolos médicos complejos si no cuenta con ellos, Suma Care expondrá una **API REST JSON nativa**, desarrollada y mantenida en nuestro servidor NestJS.

### 3.1 Mecanismo de Ingesta (API REST Propia de Suma Care)

El servidor de Suma Care dispondrá de un conjunto de endpoints REST seguros (documentados bajo especificación OpenAPI / Swagger) listos para recibir cargas masivas o actualizaciones en tiempo real desde el HIS del hospital.

El equipo de Sistemas del hospital podrá optar por cualquiera de las siguientes estrategias para alimentar nuestra API:
1. **Ingesta por Eventos (Webhooks / Rest Client):** El HIS dispara una petición HTTP POST/PATCH hacia nuestros endpoints en el instante en que se ingresa un paciente, se mueve una cama o se prescribe una orden.
2. **Sincronización Programada (Cron / Batch Jobs):** Tareas programadas en el servidor hospitalario envían deltas de información cada X minutos en formato JSON.
3. **Conectores de Base de Datos Intermedias:** Si el hospital lo prefiere, Suma Care puede consumir vistas de base de datos de solo lectura (SQL Views) dispuestas en una red local o VLAN dedicada.

---

### 3.2 Estructura y Esquemas de Payloads JSON (Ejemplos)

A continuación se detallan los contratos JSON que nuestro servidor espera recibir en los endpoints REST de ingesta:

#### A) Ingesta de Pacientes (`POST /api/v1/ingest/pacientes`)
```json
{
  "id": "PAC-998234",
  "hc": "HC-445021",
  "documento": {
    "tipo": "DNI",
    "numero": "34567890"
  },
  "apellido": "RODRIGUEZ",
  "nombre": "CARLOS ALBERTO",
  "fechaNacimiento": "1985-08-14",
  "sexo": "M",
  "obraSocial": "OSDE 310"
}
```

#### B) Ingesta de Internación y Ubicación en Cama (`POST /api/v1/ingest/internaciones`)
```json
{
  "id": "ENC-2026-8812",
  "pacienteId": "PAC-998234",
  "servicioId": "Clínica Médica",
  "ubicacion": {
    "sector": "Piso 3 - Ala Norte",
    "habitacion": "304",
    "cama": "Cama B"
  },
  "fechaIngreso": 1783490000000,
  "fechaAlta": null,
  "estado": "activa",
  "aislamiento": false
}
```

#### C) Ingesta de Órdenes y Solicitudes de Estudio (`POST /api/v1/ingest/pedidos`)
```json
{
  "id": "ORD-776123",
  "internacionId": "ENC-2026-8812",
  "servicioSolicitanteId": "Clínica Médica",
  "creadoPor": "dr_mfernandez",
  "modalidad": "tc",
  "descripcion": "Angiotomografía de tórax (protocolo TEP)",
  "regionAnatomica": "Tórax",
  "lateralidad": "No aplica",
  "conContraste": true,
  "prioridad": "urgente",
  "casoRojo": "TEP",
  "tipoTraslado": "camilla",
  "estado": "solicitado",
  "motivo": "Insuficiencia respiratoria aguda, disnea súbita y desaturación. Descartar TEP.",
  "fechaSolicitud": 1783495200000,
  "aislamiento": false
}
```

---

### 3.3 Mecanismo Técnico de Autenticación Híbrida

Para implementar el acceso sin contraseñas nuevas para el personal del hospital, nuestro servidor NestJS dispondrá de un endpoint de validación federada:

* **Validación vía LDAP / Active Directory:** Al iniciar sesión en Suma Care, si el usuario ingresa una credencial institucional, el backend realiza una consulta segura (LDAPS / puerto 636) al controlador de dominio del hospital. Si la autenticación es exitosa, Suma Care emite un token JWT local con los roles correspondientes.
* **Validación vía SSO / SAML 2.0 / OAuth2:** Alternativamente, se puede integrar el botón institucional *"Iniciar sesión con credencial hospitalaria"* redirigiendo al Identity Provider (IdP) del hospital.
* **Login Local de Fallback y Administración:** Las peticiones que utilicen cuentas administradas localmente en la base de datos de Suma Care se resuelven contra nuestro propio servicio de autenticación (`/auth/login`), garantizando redundancia y autonomía operativa para el soporte técnico.

---

### 3.4 Consideraciones de Red y Seguridad

1. **Cifrado en Tránsito:** Todas las comunicaciones REST entre el HIS hospitalario y el servidor de Suma Care deberán realizarse bajo protocolo HTTPS utilizando TLS 1.3.
2. **Aislamiento de Red (VLAN):** Se recomienda desplegar el servidor NestJS de Suma Care en una VLAN clínica o servidor virtual dentro de la red interna del hospital, accesible por las estaciones de trabajo y camillería sin exposición a Internet pública.
3. **Autenticación de API:** Los servicios de sistemas del hospital autenticarán sus peticiones POST/PATCH utilizando tokens de API estáticos (Bearer Tokens) o certificados mutuos (mTLS) de alta seguridad.
