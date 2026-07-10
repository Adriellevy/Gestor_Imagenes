import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, In, Repository } from 'typeorm';
import { Pedido } from './entities/pedido.entity';
import { EstudioSolicitado } from './entities/estudio-solicitado.entity';
import { TipoEstudio } from '../tipos-estudio/entities/tipo-estudio.entity';

const ESTUDIO_RELATIONS = ['estudioSolicitado', 'estudioSolicitado.tipoEstudio'];

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido)
    private readonly pedidosRepository: Repository<Pedido>,
    @InjectRepository(TipoEstudio)
    private readonly tiposEstudioRepository: Repository<TipoEstudio>,
    private readonly dataSource: DataSource,
  ) {}

  private toApiShape(pedido: Pedido): any {
    const { estudioSolicitado, ...rest } = pedido;
    return {
      ...rest,
      modalidad: estudioSolicitado?.tipoEstudio?.codigo ?? null,
      descripcion: estudioSolicitado?.descripcion ?? null,
    };
  }

  private async resolveTipoEstudioId(codigo: string): Promise<number> {
    const tipoEstudio = await this.tiposEstudioRepository.findOne({ where: { codigo, tipo: 'IMG' } });
    if (!tipoEstudio) {
      throw new NotFoundException(`Tipo de estudio '${codigo}' no encontrado`);
    }
    return tipoEstudio.id;
  }

  private async findOneApiShape(id: string): Promise<any | null> {
    const pedido = await this.pedidosRepository.findOne({ where: { id }, relations: ESTUDIO_RELATIONS });
    return pedido ? this.toApiShape(pedido) : null;
  }

  async findAll(): Promise<any[]> {
    const pedidos = await this.pedidosRepository.find({
      where: { estado: Not(In(['realizado', 'cancelado'])) },
      relations: ESTUDIO_RELATIONS,
    });
    return pedidos.map((p) => this.toApiShape(p));
  }

  async findTerminados(page: number, limit: number): Promise<{ data: any[], total: number, page: number, limit: number }> {
    const [data, total] = await this.pedidosRepository.findAndCount({
      where: { estado: In(['realizado', 'cancelado']) },
      relations: ESTUDIO_RELATIONS,
      order: { fechaSolicitud: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: data.map((p) => this.toApiShape(p)), total, page, limit };
  }

  async create(body: any): Promise<any> {
    const { modalidad, descripcion, ...pedidoData } = body;
    const tipoEstudioId = await this.resolveTipoEstudioId(modalidad);

    const pedidoGuardado = await this.dataSource.transaction(async (manager) => {
      const nuevo = manager.create(Pedido, {
        ...pedidoData,
        id: 'ped_' + Math.random().toString(36).slice(2, 9),
      });
      const pedido = await manager.save(Pedido, nuevo);
      await manager.save(
        EstudioSolicitado,
        manager.create(EstudioSolicitado, { pedidoId: pedido.id, tipoEstudioId, descripcion }),
      );
      return pedido;
    });

    return this.findOneApiShape(pedidoGuardado.id);
  }

  async update(id: string, updateData: any): Promise<any | null> {
    const pedido = await this.pedidosRepository.findOneBy({ id });
    if (!pedido) return null;

    const { modalidad, descripcion, ...pedidoUpdates } = updateData;

    await this.dataSource.transaction(async (manager) => {
      if (Object.keys(pedidoUpdates).length > 0) {
        await manager.save(Pedido, { ...pedido, ...pedidoUpdates });
      }
      if (modalidad !== undefined || descripcion !== undefined) {
        const estudio = await manager.findOneBy(EstudioSolicitado, { pedidoId: id });
        if (estudio) {
          if (modalidad !== undefined) {
            estudio.tipoEstudioId = await this.resolveTipoEstudioId(modalidad);
          }
          if (descripcion !== undefined) {
            estudio.descripcion = descripcion;
          }
          await manager.save(EstudioSolicitado, estudio);
        }
      }
    });

    return this.findOneApiShape(id);
  }

  async cambiarEstado(id: string, estado: string, userId: string): Promise<any | null> {
    const pedido = await this.pedidosRepository.findOneBy({ id });
    if (!pedido) return null;

    pedido.estado = estado;
    pedido.historial = [
      ...(pedido.historial || []),
      { estado, ts: Date.now(), por: userId }
    ];

    await this.pedidosRepository.save(pedido);
    return this.findOneApiShape(id);
  }

  async acuseReciboEmergencia(id: string, userId: string): Promise<any | null> {
    const pedido = await this.pedidosRepository.findOneBy({ id });
    if (!pedido || pedido.prioridad !== 'urgente') return null;

    pedido.emergenciaVista = { ts: Date.now(), por: userId };
    await this.pedidosRepository.save(pedido);
    return this.findOneApiShape(id);
  }
}
