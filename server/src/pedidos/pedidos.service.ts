import { Injectable } from '@nestjs/common';
import { PEDIDOS_SEED } from '../data/seed';
import { Pedido } from '../data/types';

@Injectable()
export class PedidosService {
  private pedidos: Pedido[] = [...PEDIDOS_SEED];

  findAll(): Pedido[] {
    return this.pedidos.filter(p => p.estado !== 'realizado' && p.estado !== 'cancelado');
  }

  findTerminados(page: number, limit: number): { data: Pedido[], total: number, page: number, limit: number } {
    const terminados = this.pedidos.filter(p => p.estado === 'realizado' || p.estado === 'cancelado');
    // Sort descending by request date so newer completed are first
    terminados.sort((a, b) => b.fechaSolicitud - a.fechaSolicitud);
    const start = (page - 1) * limit;
    const data = terminados.slice(start, start + limit);
    return { data, total: terminados.length, page, limit };
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

  cambiarEstado(id: string, estado: string, userId: string): Pedido | null {
    const pedido = this.pedidos.find((p) => p.id === id);
    if (!pedido) return null;
    
    pedido.estado = estado;
    pedido.historial = [
      ...(pedido.historial || []),
      { estado, ts: Date.now(), por: userId }
    ];
    
    return pedido;
  }

  reset(): void {
    this.pedidos = [...PEDIDOS_SEED];
  }
}
