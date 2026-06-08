import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PacientesModule } from './pacientes/pacientes.module';
import { InternacionesModule } from './internaciones/internaciones.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AuthModule, UsuariosModule, PacientesModule, InternacionesModule, PedidosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
