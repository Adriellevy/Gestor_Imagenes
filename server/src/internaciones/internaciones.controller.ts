import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { InternacionesService } from './internaciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Internacion } from '../data/types';

@Controller('internaciones')
export class InternacionesController {
  constructor(private readonly internacionesService: InternacionesService) {}

  @Get()
  findAll() {
    return this.internacionesService.findAll();
  }

  @Post()
  create(@Body() internacion: Internacion) {
    return this.internacionesService.create(internacion);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/ubicacion')
  updateUbicacion(
    @Param('id') id: string,
    @Body('cama') cama: string,
    @Body('sector') sector?: string,
  ) {
    return this.internacionesService.updateUbicacion(id, cama, sector);
  }
}
