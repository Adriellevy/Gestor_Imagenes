import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Paciente } from '../pacientes/entities/paciente.entity';
import { Internacion } from '../internaciones/entities/internacion.entity';
import { Pedido } from '../pedidos/entities/pedido.entity';
import { EstudioSolicitado } from '../pedidos/entities/estudio-solicitado.entity';
import { TipoEstudio } from '../tipos-estudio/entities/tipo-estudio.entity';
import { USUARIOS, PACIENTES, INTERNACIONES, PEDIDOS_SEED, TIPOS_ESTUDIO_SEED, ESTUDIOS_SOLICITADOS_SEED } from './seed';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(Usuario) private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Paciente) private readonly pacientesRepository: Repository<Paciente>,
    @InjectRepository(Internacion) private readonly internacionesRepository: Repository<Internacion>,
    @InjectRepository(Pedido) private readonly pedidosRepository: Repository<Pedido>,
    @InjectRepository(EstudioSolicitado) private readonly estudiosSolicitadosRepository: Repository<EstudioSolicitado>,
    @InjectRepository(TipoEstudio) private readonly tiposEstudioRepository: Repository<TipoEstudio>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.seed();
  }

  async seed(force = false): Promise<void> {
    const seedUsers = String(this.configService.get('SEED_MOCK_USERS', 'true')).toLowerCase() === 'true';
    const seedData = String(this.configService.get('SEED_MOCK_DATA', 'true')).toLowerCase() === 'true';

    // Catálogo de tipos de estudio: dato estructural, no mock. Tabla compartida con
    // otro sistema (HEMO), nunca se borra en un reset.
    const tiposEstudioCount = await this.tiposEstudioRepository.count({ where: { tipo: 'IMG' } });
    if (tiposEstudioCount === 0) {
      await this.tiposEstudioRepository.save(TIPOS_ESTUDIO_SEED);
      this.logger.log('Seeder: Catálogo de tipos de estudio (IMG) cargado exitosamente.');
    }

    if (seedUsers) {
      const usersCount = await this.usuariosRepository.count();
      if (force || usersCount === 0) {
        if (force) {
          await this.usuariosRepository.createQueryBuilder().delete().execute();
        }
        await this.usuariosRepository.save(USUARIOS as unknown as Usuario[]);
        this.logger.log('Seeder: Usuarios mock cargados exitosamente en la base de datos.');
      }
    }

    if (seedData) {
      const pedidosCount = await this.pedidosRepository.count();
      if (force || pedidosCount === 0) {
        if (force) {
          await this.pedidosRepository.createQueryBuilder().delete().execute();
          await this.internacionesRepository.createQueryBuilder().delete().execute();
          await this.pacientesRepository.createQueryBuilder().delete().execute();
        }
        await this.pacientesRepository.save(PACIENTES as unknown as Paciente[]);
        await this.internacionesRepository.save(INTERNACIONES as unknown as Internacion[]);
        await this.pedidosRepository.save(PEDIDOS_SEED as unknown as Pedido[]);

        const tiposEstudio = await this.tiposEstudioRepository.find({ where: { tipo: 'IMG' } });
        const codigoToId = new Map(tiposEstudio.map((t) => [t.codigo, t.id]));
        const estudiosSolicitados = ESTUDIOS_SOLICITADOS_SEED.map((e) => ({
          pedidoId: e.pedidoId,
          tipoEstudioId: codigoToId.get(e.codigo),
          descripcion: e.descripcion,
        }));
        await this.estudiosSolicitadosRepository.save(estudiosSolicitados as EstudioSolicitado[]);

        this.logger.log('Seeder: Objetos mock de BB.DD. (pacientes, internaciones, pedidos, estudios solicitados) cargados exitosamente.');
      }
    }
  }

  async reset(): Promise<void> {
    await this.seed(true);
  }
}
