import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Paciente } from '../pacientes/entities/paciente.entity';
import { Internacion } from '../internaciones/entities/internacion.entity';
import { Pedido } from '../pedidos/entities/pedido.entity';
import { EstudioSolicitado } from '../pedidos/entities/estudio-solicitado.entity';
import { TipoEstudio } from '../tipos-estudio/entities/tipo-estudio.entity';
import { USUARIOS, PACIENTES, INTERNACIONES, PEDIDOS_SEED, TIPOS_ESTUDIO_SEED, ESTUDIOS_SOLICITADOS_SEED } from './seed';

dotenv.config();

async function run() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE ?? 'db_bed_manager',
    entities: [Usuario, Paciente, Internacion, Pedido, TipoEstudio, EstudioSolicitado],
    synchronize: true,
  });

  await dataSource.initialize();

  await dataSource.getRepository(Pedido).createQueryBuilder().delete().execute();
  await dataSource.getRepository(Internacion).createQueryBuilder().delete().execute();
  await dataSource.getRepository(Paciente).createQueryBuilder().delete().execute();
  await dataSource.getRepository(Usuario).createQueryBuilder().delete().execute();

  await dataSource.getRepository(Usuario).save(USUARIOS as Usuario[]);
  await dataSource.getRepository(Paciente).save(PACIENTES as Paciente[]);
  await dataSource.getRepository(Internacion).save(INTERNACIONES as Internacion[]);
  await dataSource.getRepository(Pedido).save(PEDIDOS_SEED as Pedido[]);

  const tiposEstudioCount = await dataSource.getRepository(TipoEstudio).count({ where: { tipo: 'IMG' } });
  if (tiposEstudioCount === 0) {
    await dataSource.getRepository(TipoEstudio).save(TIPOS_ESTUDIO_SEED);
  }
  const tiposEstudio = await dataSource.getRepository(TipoEstudio).find({ where: { tipo: 'IMG' } });
  const codigoToId = new Map(tiposEstudio.map((t) => [t.codigo, t.id]));
  const estudiosSolicitados = ESTUDIOS_SOLICITADOS_SEED.map((e) => ({
    pedidoId: e.pedidoId,
    tipoEstudioId: codigoToId.get(e.codigo),
    descripcion: e.descripcion,
  }));
  await dataSource.getRepository(EstudioSolicitado).save(estudiosSolicitados as EstudioSolicitado[]);

  console.log('Seed cargado en la base de datos.');
  await dataSource.destroy();
}

run().catch((err) => {
  console.error('Error al cargar el seed:', err);
  process.exit(1);
});
