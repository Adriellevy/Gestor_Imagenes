import { Type } from 'class-transformer';
import { IsArray, IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

class BundleEntryResourceDto {
  @IsString()
  resourceType: string;

  [key: string]: unknown;
}

class BundleEntryDto {
  @IsObject()
  @ValidateNested()
  @Type(() => BundleEntryResourceDto)
  resource: BundleEntryResourceDto;
}

// Validación estructural mínima (no conformance FHIR completa): solo
// confirma que lo que llega tiene forma de Bundle con entries que traen
// un resourceType reconocible. El resto de las reglas (campos requeridos
// por recurso) las tira cada mapper.
export class FhirBundleDto {
  @IsIn(['Bundle'])
  resourceType: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleEntryDto)
  entry: BundleEntryDto[];
}
