import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PacientesModule } from './pacientes/pacientes.module';
import { InternacionesModule } from './internaciones/internaciones.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { AuthModule } from './auth/auth.module';
import { SeederModule } from './data/seeder.module';
import { TiposEstudioModule } from './tipos-estudio/tipos-estudio.module';
import { Usuario } from './usuarios/entities/usuario.entity';
import { Paciente } from './pacientes/entities/paciente.entity';
import { Internacion } from './internaciones/entities/internacion.entity';
import { Pedido } from './pedidos/entities/pedido.entity';
import { EstudioSolicitado } from './pedidos/entities/estudio-solicitado.entity';
import { TipoEstudio } from './tipos-estudio/entities/tipo-estudio.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USERNAME', 'root'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_DATABASE', 'db_bed_manager'),
        entities: [Usuario, Paciente, Internacion, Pedido, TipoEstudio, EstudioSolicitado],
        synchronize: true,
      }),
    }),
    AuthModule,
    UsuariosModule,
    PacientesModule,
    InternacionesModule,
    PedidosModule,
    TiposEstudioModule,
    SeederModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
