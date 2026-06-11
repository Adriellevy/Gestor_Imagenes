import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  findAll() {
    return this.pedidosService.findAll();
  }

  @Get('terminados')
  findTerminados(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '6'
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 6;
    return this.pedidosService.findTerminados(pageNum, limitNum);
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
