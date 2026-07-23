import { Body, Controller, Param, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { FhirIngestService } from './fhir-ingest.service';
import { FhirApiKeyGuard } from './guards/fhir-api-key.guard';
import { FhirBundleDto } from './dto/fhir-bundle.dto';

@UseGuards(FhirApiKeyGuard)
@Controller('fhir')
export class FhirIngestController {
  constructor(private readonly fhirIngestService: FhirIngestService) {}

  @Post('ingest')
  ingestBundle(@Body(new ValidationPipe({ transform: true })) bundle: FhirBundleDto) {
    return this.fhirIngestService.ingestBundle(bundle);
  }

  @Post('ingest/:resourceType')
  ingestOne(@Param('resourceType') resourceType: string, @Body() resource: any) {
    return this.fhirIngestService.ingestOne({ ...resource, resourceType });
  }
}
