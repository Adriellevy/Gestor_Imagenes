import { Controller, Get, Post, Body } from '@nestjs/common';
import { InternacionesService } from './internaciones.service';
import type { Internacion } from '../data/types';

@Controller('internaciones')
export class InternacionesController {
  constructor(private readonly internacionesService: InternacionesService) {}

  @Get()
  findAll() {
    return this.internacionesService.findAll();
  }

  @Post()
  create(@Body() internacion: Internacion): Internacion {
    return this.internacionesService.create(internacion);
  }
}
