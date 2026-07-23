import { Module } from '@nestjs/common';
import { PacientesModule } from '../pacientes/pacientes.module';
import { InternacionesModule } from '../internaciones/internaciones.module';
import { PedidosModule } from '../pedidos/pedidos.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { FhirIngestController } from './fhir-ingest.controller';
import { FhirIngestService } from './fhir-ingest.service';
import { FhirReadController } from './fhir-read.controller';
import { FhirReadService } from './fhir-read.service';
import { FhirApiKeyGuard } from './guards/fhir-api-key.guard';

@Module({
  imports: [PacientesModule, InternacionesModule, PedidosModule, UsuariosModule],
  controllers: [FhirIngestController, FhirReadController],
  providers: [FhirIngestService, FhirReadService, FhirApiKeyGuard],
})
export class FhirModule {}
