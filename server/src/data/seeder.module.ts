import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Paciente } from '../pacientes/entities/paciente.entity';
import { Internacion } from '../internaciones/entities/internacion.entity';
import { Pedido } from '../pedidos/entities/pedido.entity';
import { EstudioSolicitado } from '../pedidos/entities/estudio-solicitado.entity';
import { TipoEstudio } from '../tipos-estudio/entities/tipo-estudio.entity';
import { SeederService } from './seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Paciente, Internacion, Pedido, EstudioSolicitado, TipoEstudio])],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
