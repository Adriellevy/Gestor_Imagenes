import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class FhirApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    const apiKey = this.configService.get<string>('FHIR_INGEST_API_KEY');
    if (!apiKey || type !== 'Bearer' || token !== apiKey) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
