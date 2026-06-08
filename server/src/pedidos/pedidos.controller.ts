import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  findAll() {
    return this.pedidosService.findAll();
  }

  @Post()
  create(@Body() body: any) {
    return this.pedidosService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.pedidosService.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/estado')
  cambiarEstado(
    @Param('id') id: string,
    @Body('estado') estado: string,
    @Body('userId') userId: string,
  ) {
    return this.pedidosService.cambiarEstado(id, estado, userId);
  }
}
