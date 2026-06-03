import { Injectable } from '@nestjs/common';
import { PEDIDOS_SEED } from '../data/seed';
import { Pedido } from '../data/types';

@Injectable()
export class PedidosService {
  private pedidos: Pedido[] = [...PEDIDOS_SEED];

  findAll(): Pedido[] {
    return this.pedidos;
  }

  create(pedido: Omit<Pedido, 'id'>): Pedido {
    const nuevo: Pedido = {
      ...pedido,
      id: 'ped_' + Math.random().toString(36).slice(2, 9),
    };
    this.pedidos.push(nuevo);
    return nuevo;
  }

  update(id: string, updateData: Partial<Pedido>): Pedido | null {
    const idx = this.pedidos.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.pedidos[idx] = { ...this.pedidos[idx], ...updateData };
      return this.pedidos[idx];
    }
    return null;
  }

  reset(): void {
    this.pedidos = [...PEDIDOS_SEED];
  }
}
