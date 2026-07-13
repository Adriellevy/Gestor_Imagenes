import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternacionesController } from './internaciones.controller';
import { InternacionesService } from './internaciones.service';
import { Internacion } from './entities/internacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Internacion])],
  controllers: [InternacionesController],
  providers: [InternacionesService],
  exports: [InternacionesService]
})
export class InternacionesModule {}
