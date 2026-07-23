import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { FhirReadService } from './fhir-read.service';
import { FhirApiKeyGuard } from './guards/fhir-api-key.guard';
import { getFhirCapabilityStatement } from './fhir-capability';

@Controller('fhir')
export class FhirReadController {
  constructor(private readonly fhirReadService: FhirReadService) {}

  @Get('metadata')
  metadata() {
    return getFhirCapabilityStatement();
  }

  @UseGuards(FhirApiKeyGuard)
  @Get('Patient/:id')
  getPatient(@Param('id') id: string) {
    return this.fhirReadService.getPatient(id);
  }

  @UseGuards(FhirApiKeyGuard)
  @Get('Encounter/:id')
  getEncounter(@Param('id') id: string) {
    return this.fhirReadService.getEncounter(id);
  }

  @UseGuards(FhirApiKeyGuard)
  @Get('Practitioner/:id')
  getPractitioner(@Param('id') id: string) {
    return this.fhirReadService.getPractitioner(id);
  }

  @UseGuards(FhirApiKeyGuard)
  @Get('ServiceRequest')
  searchServiceRequests(@Query('patient') patient?: string, @Query('status') status?: string) {
    return this.fhirReadService.searchServiceRequests(patient, status);
  }

  @UseGuards(FhirApiKeyGuard)
  @Get('ServiceRequest/:id')
  getServiceRequest(@Param('id') id: string) {
    return this.fhirReadService.getServiceRequest(id);
  }
}
