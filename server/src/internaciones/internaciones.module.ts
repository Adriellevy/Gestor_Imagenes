import { Module } from '@nestjs/common';
import { InternacionesController } from './internaciones.controller';
import { InternacionesService } from './internaciones.service';

@Module({
  controllers: [InternacionesController],
  providers: [InternacionesService],
  exports: [InternacionesService]
})
export class InternacionesModule {}
