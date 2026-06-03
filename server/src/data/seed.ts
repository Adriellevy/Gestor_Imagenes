import { Paciente, Internacion, Usuario, Pedido } from './types';

const minsAgo = (m: number) => Date.now() - m * 60000;
const uid = (p = '') => p + Math.random().toString(36).slice(2, 9);
const today = (y: number, mo: number, d: number) => new Date(y, mo - 1, d).toISOString();

export const USUARIOS: Usuario[] = [
  { id: 'u1', nombre: 'Dra. Acosta', rol: 'medico', servicio: 'Clínica médica (7mo piso A)' },
  { id: 'u2', nombre: 'Dr. Benítez', rol: 'medico', servicio: 'UCO' },
  { id: 'u3', nombre: 'Téc. Ríos', rol: 'tecnico', sectores: [] },
  { id: 'u4', nombre: 'Téc. Molina', rol: 'tecnico', sectores: ['tc', 'rm'] },
  { id: 'u5', nombre: 'Adm. Torres', rol: 'administrativo' },
  { id: 'u6', nombre: 'Sistemas', rol: 'admin' },
];

export const PACIENTES: Paciente[] = [
  { id: 'p1', hc: '1042318', documento: { tipo: 'DNI', numero: '28.945.110' }, apellido: 'González', nombre: 'Marta', fechaNacimiento: today(1958, 4, 12), sexo: 'F' },
  { id: 'p2', hc: '1038945', documento: { tipo: 'DNI', numero: '20.114.876' }, apellido: 'Pereyra', nombre: 'Jorge', fechaNacimiento: today(1953, 9, 3), sexo: 'M' },
  { id: 'p3', hc: '1095102', documento: { tipo: 'DNI', numero: '41.302.559' }, apellido: 'Fernández', nombre: 'Lucía', fechaNacimiento: today(2017, 6, 21), sexo: 'F' },
  { id: 'p4', hc: '1051877', documento: { tipo: 'DNI', numero: '16.778.234' }, apellido: 'Sosa', nombre: 'Roberto', fechaNacimiento: today(1967, 1, 30), sexo: 'M' },
  { id: 'p5', hc: '1063340', documento: { tipo: 'DNI', numero: '33.567.901' }, apellido: 'Díaz', nombre: 'Ana Beatriz', fechaNacimiento: today(1980, 11, 8), sexo: 'F' },
  { id: 'p6', hc: '1009921', documento: { tipo: 'DNI', numero: '12.090.443' }, apellido: 'Ramírez', nombre: 'Héctor', fechaNacimiento: today(1945, 3, 17), sexo: 'M' },
  { id: 'p7', hc: '1087654', documento: { tipo: 'DNI', numero: '39.811.276' }, apellido: 'Castro', nombre: 'Sofía', fechaNacimiento: today(1991, 7, 2), sexo: 'F' },
  { id: 'p8', hc: '1029013', documento: { tipo: 'DNI', numero: '25.443.668' }, apellido: 'Ibáñez', nombre: 'Daniel', fechaNacimiento: today(1964, 12, 19), sexo: 'M' },
  { id: 'p9', hc: '1071266', documento: { tipo: 'DNI', numero: '30.225.187' }, apellido: 'Núñez', nombre: 'Valeria', fechaNacimiento: today(1996, 5, 27), sexo: 'F' },
  { id: 'p10', hc: '1014488', documento: { tipo: 'DNI', numero: '14.556.029' }, apellido: 'Paz', nombre: 'Miguel Ángel', fechaNacimiento: today(1949, 8, 14), sexo: 'M' },
  { id: 'p11', hc: '1080557', documento: { tipo: 'DNI', numero: '37.901.554' }, apellido: 'Medina', nombre: 'Carla', fechaNacimiento: today(1973, 2, 9), sexo: 'F' },
];

export const INTERNACIONES: Internacion[] = [
  { id: 'i1', pacienteId: 'p1', servicioId: 'UCO', ubicacion: { sector: 'UCO', habitacion: '—', cama: 'UCO 2' }, fechaIngreso: minsAgo(2880), fechaAlta: null, estado: 'activa' },
  { id: 'i2', pacienteId: 'p2', servicioId: 'UTI 1 (5to piso)', ubicacion: { sector: 'UTI 1 (5to piso)', habitacion: '—', cama: 'UTI1 3' }, fechaIngreso: minsAgo(5760), fechaAlta: null, estado: 'activa' },
  { id: 'i3', pacienteId: 'p3', servicioId: 'Clínica médica (9no piso B)', ubicacion: { sector: 'Clínica médica (9no piso B)', habitacion: '905', cama: 'Cama 905' }, fechaIngreso: minsAgo(1440), fechaAlta: null, estado: 'activa' },
  { id: 'i4', pacienteId: 'p4', servicioId: 'Telemetría', ubicacion: { sector: 'Telemetría', habitacion: '—', cama: 'Tele 4' }, fechaIngreso: minsAgo(4320), fechaAlta: null, estado: 'activa' },
  { id: 'i5', pacienteId: 'p5', servicioId: 'Clínica médica (8vo piso A)', ubicacion: { sector: 'Clínica médica (8vo piso A)', habitacion: '818', cama: 'Cama 818' }, fechaIngreso: minsAgo(2160), fechaAlta: null, estado: 'activa' },
  { id: 'i6', pacienteId: 'p6', servicioId: 'Clínica médica (7mo piso A)', ubicacion: { sector: 'Clínica médica (7mo piso A)', habitacion: '707', cama: 'Cama 707' }, fechaIngreso: minsAgo(7200), fechaAlta: null, estado: 'activa' },
  { id: 'i7', pacienteId: 'p7', servicioId: 'Recuperación cardiovascular', ubicacion: { sector: 'Recuperación cardiovascular', habitacion: '—', cama: 'RCV 1' }, fechaIngreso: minsAgo(720), fechaAlta: null, estado: 'activa' },
  { id: 'i8', pacienteId: 'p8', servicioId: 'UTI 2 (6to piso)', ubicacion: { sector: 'UTI 2 (6to piso)', habitacion: '—', cama: 'UTI2 2' }, fechaIngreso: minsAgo(8640), fechaAlta: null, estado: 'activa' },
  { id: 'i9', pacienteId: 'p9', servicioId: 'Guardia', ubicacion: { sector: 'Guardia', habitacion: '—', cama: 'Guardia 2' }, fechaIngreso: minsAgo(360), fechaAlta: null, estado: 'activa' },
  { id: 'i10', pacienteId: 'p10', servicioId: 'Clínica médica (8vo piso B)', ubicacion: { sector: 'Clínica médica (8vo piso B)', habitacion: '809', cama: 'Cama 809' }, fechaIngreso: minsAgo(2520), fechaAlta: null, estado: 'activa' },
  { id: 'i11', pacienteId: 'p11', servicioId: 'Telemetría', ubicacion: { sector: 'Telemetría', habitacion: '—', cama: 'Tele 2' }, fechaIngreso: minsAgo(1080), fechaAlta: null, estado: 'activa' },
];

export const PEDIDOS_SEED: Pedido[] = [
  { id: uid('ped_'), internacionId: 'i1', servicioSolicitanteId: 'UCO', creadoPor: 'u2', modalidad: 'tc', descripcion: 'Angiotomografía de encéfalo (vasos intra y extracraneanos)', tipoTraslado: 'camilla', regionAnatomica: 'Encéfalo', conContraste: true, prioridad: 'urgente', estado: 'solicitado', motivo: 'ACV', fechaSolicitud: minsAgo(54) },
  { id: uid('ped_'), internacionId: 'i2', servicioSolicitanteId: 'UTI 1 (5to piso)', modalidad: 'rx', descripcion: 'Rx de tórax portátil', tipoTraslado: 'habitacion', regionAnatomica: 'Tórax', conContraste: false, prioridad: 'urgente', estado: 'en_proceso', motivo: 'Control de vía central.', fechaSolicitud: minsAgo(38) },
  { id: uid('ped_'), internacionId: 'i3', servicioSolicitanteId: 'Clínica médica (9no piso B)', modalidad: 'rx', descripcion: 'Rx de muñeca derecha (F y P)', tipoTraslado: 'silla', regionAnatomica: 'Muñeca', lateralidad: 'derecha', conContraste: false, prioridad: 'prioritario', estado: 'solicitado', motivo: 'Traumatismo, sospecha de fractura.', fechaSolicitud: minsAgo(22) },
  { id: uid('ped_'), internacionId: 'i4', servicioSolicitanteId: 'Telemetría', modalidad: 'ecocardio', descripcion: 'Ecocardiograma transtorácico', tipoTraslado: 'habitacion', regionAnatomica: 'Corazón', conContraste: false, prioridad: 'prioritario', estado: 'solicitado', motivo: 'Disnea de esfuerzo, evaluar FEVI.', fechaSolicitud: minsAgo(71) },
  { id: uid('ped_'), internacionId: 'i5', servicioSolicitanteId: 'Clínica médica (8vo piso A)', modalidad: 'rm', descripcion: 'RM de cerebro c/ y s/ contraste', tipoTraslado: 'camilla', regionAnatomica: 'Cerebro', conContraste: true, prioridad: 'prioritario', estado: 'autorizacion_pendiente', motivo: 'Cefalea persistente con foco neurológico.', fechaSolicitud: minsAgo(95) },
  { id: uid('ped_'), internacionId: 'i6', servicioSolicitanteId: 'Clínica médica (7mo piso A)', creadoPor: 'u1', modalidad: 'rx', descripcion: 'Rx de tórax (F)', tipoTraslado: 'habitacion', regionAnatomica: 'Tórax', conContraste: false, prioridad: 'normal', estado: 'realizado', motivo: 'Control evolutivo de neumonía.', fechaSolicitud: minsAgo(160) },
  { id: uid('ped_'), internacionId: 'i7', servicioSolicitanteId: 'Recuperación cardiovascular', modalidad: 'tc', descripcion: 'Angiotomografía de tórax (protocolo TEP)', tipoTraslado: 'asistido', regionAnatomica: 'Tórax', conContraste: true, prioridad: 'urgente', estado: 'solicitado', motivo: 'TEP', fechaSolicitud: minsAgo(12) },
  { id: uid('ped_'), internacionId: 'i8', servicioSolicitanteId: 'UTI 2 (6to piso)', modalidad: 'eco', descripcion: 'Eco-doppler de MMII', tipoTraslado: 'habitacion', regionAnatomica: 'Miembros inferiores', lateralidad: 'bilateral', conContraste: false, prioridad: 'prioritario', estado: 'en_proceso', motivo: 'Edema unilateral, descartar TVP.', fechaSolicitud: minsAgo(44) },
  { id: uid('ped_'), internacionId: 'i9', servicioSolicitanteId: 'Guardia', modalidad: 'eco', descripcion: 'Ecografía abdominal', tipoTraslado: 'ambulatorio', regionAnatomica: 'Abdomen', conContraste: false, prioridad: 'normal', estado: 'solicitado', motivo: 'Dolor en fosa ilíaca derecha.', fechaSolicitud: minsAgo(8) },
  { id: uid('ped_'), internacionId: 'i10', servicioSolicitanteId: 'Clínica médica (8vo piso B)', modalidad: 'tc', descripcion: 'Tomografía de encéfalo (sin contraste)', tipoTraslado: 'camilla', regionAnatomica: 'Cerebro', conContraste: false, prioridad: 'urgente', estado: 'realizado', motivo: 'ACV', fechaSolicitud: minsAgo(190) },
  { id: uid('ped_'), internacionId: 'i11', servicioSolicitanteId: 'Telemetría', modalidad: 'rx', descripcion: 'Rx de tórax (F y P)', tipoTraslado: 'silla', regionAnatomica: 'Tórax', conContraste: false, prioridad: 'normal', estado: 'solicitado', motivo: 'Evaluación prequirúrgica.', fechaSolicitud: minsAgo(33) },
  { id: uid('ped_'), internacionId: 'i6', servicioSolicitanteId: 'Clínica médica (7mo piso A)', creadoPor: 'u1', modalidad: 'mn', descripcion: 'Centellograma óseo corporal total', tipoTraslado: 'camilla', regionAnatomica: 'Cuerpo entero', conContraste: false, prioridad: 'normal', estado: 'autorizacion_pendiente', motivo: 'Búsqueda de secundarismo óseo.', fechaSolicitud: minsAgo(120) },
];
