import { Controller, Get } from '@nestjs/common';
import { TiposEstudioService } from './tipos-estudio.service';

@Controller('tipos-estudio')
export class TiposEstudioController {
  constructor(private readonly tiposEstudioService: TiposEstudioService) {}

  @Get()
  findAll() {
    return this.tiposEstudioService.findAll();
  }
}
