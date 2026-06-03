import { Controller, Get, Post, Body } from '@nestjs/common';
import { PacientesService } from './pacientes.service';
import type { Paciente } from '../data/types';

@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  @Get('padron')
  getPadron() {
    return this.pacientesService.getPadron();
  }

  @Get()
  findAll() {
    return this.pacientesService.findAll();
  }
  @Post()
  create(@Body() paciente: Paciente): Paciente {
    return this.pacientesService.create(paciente);
  }
}
