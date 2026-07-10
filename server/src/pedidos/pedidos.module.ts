import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
import { Pedido } from './entities/pedido.entity';
import { EstudioSolicitado } from './entities/estudio-solicitado.entity';
import { TipoEstudio } from '../tipos-estudio/entities/tipo-estudio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pedido, EstudioSolicitado, TipoEstudio])],
  controllers: [PedidosController],
  providers: [PedidosService],
  exports: [PedidosService]
})
export class PedidosModule {}
