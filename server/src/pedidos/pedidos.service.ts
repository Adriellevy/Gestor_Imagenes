import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, In, Repository } from 'typeorm';
import { PEDIDOS_SEED } from '../data/seed';
import { Pedido } from './entities/pedido.entity';

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido)
    private readonly pedidosRepository: Repository<Pedido>,
  ) {}

  findAll(): Promise<Pedido[]> {
    return this.pedidosRepository.find({
      where: { estado: Not(In(['realizado', 'cancelado'])) },
    });
  }

  async findTerminados(page: number, limit: number): Promise<{ data: Pedido[], total: number, page: number, limit: number }> {
    const [data, total] = await this.pedidosRepository.findAndCount({
      where: { estado: In(['realizado', 'cancelado']) },
      order: { fechaSolicitud: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  create(pedido: Omit<Pedido, 'id'>): Promise<Pedido> {
    const nuevo = this.pedidosRepository.create({
      ...pedido,
      id: 'ped_' + Math.random().toString(36).slice(2, 9),
    });
    return this.pedidosRepository.save(nuevo);
  }

  async update(id: string, updateData: Partial<Pedido>): Promise<Pedido | null> {
    const pedido = await this.pedidosRepository.findOneBy({ id });
    if (!pedido) return null;
    await this.pedidosRepository.save({ ...pedido, ...updateData });
    return this.pedidosRepository.findOneBy({ id });
  }

  async cambiarEstado(id: string, estado: string, userId: string): Promise<Pedido | null> {
    const pedido = await this.pedidosRepository.findOneBy({ id });
    if (!pedido) return null;

    pedido.estado = estado;
    pedido.historial = [
      ...(pedido.historial || []),
      { estado, ts: Date.now(), por: userId }
    ];

    return this.pedidosRepository.save(pedido);
  }

  async reset(): Promise<void> {
    await this.pedidosRepository.createQueryBuilder().delete().execute();
    await this.pedidosRepository.save(PEDIDOS_SEED as Pedido[]);
  }
}
