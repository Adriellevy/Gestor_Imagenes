import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposEstudioController } from './tipos-estudio.controller';
import { TiposEstudioService } from './tipos-estudio.service';
import { TipoEstudio } from './entities/tipo-estudio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TipoEstudio])],
  controllers: [TiposEstudioController],
  providers: [TiposEstudioService],
  exports: [TiposEstudioService],
})
export class TiposEstudioModule {}
