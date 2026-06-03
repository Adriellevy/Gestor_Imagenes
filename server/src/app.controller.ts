import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { PacientesService } from './pacientes/pacientes.service';
import { InternacionesService } from './internaciones/internaciones.service';
import { PedidosService } from './pedidos/pedidos.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly pacientesService: PacientesService,
    private readonly internacionesService: InternacionesService,
    private readonly pedidosService: PedidosService
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('reset')
  resetData() {
    this.pacientesService.reset();
    this.internacionesService.reset();
    this.pedidosService.reset();
    return { success: true };
  }
}
