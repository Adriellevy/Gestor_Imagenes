import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { PacientesService } from './pacientes/pacientes.service';
import { InternacionesService } from './internaciones/internaciones.service';
import { PedidosService } from './pedidos/pedidos.service';
import { SeederService } from './data/seeder.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly pacientesService: PacientesService,
    private readonly internacionesService: InternacionesService,
    private readonly pedidosService: PedidosService,
    private readonly seederService: SeederService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('reset')
  async resetData() {
    await this.seederService.reset();
    return { success: true };
  }
}
