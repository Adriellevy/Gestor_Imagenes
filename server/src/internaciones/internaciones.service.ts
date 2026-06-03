import { Injectable } from '@nestjs/common';
import { INTERNACIONES } from '../data/seed';
import { Internacion } from '../data/types';

@Injectable()
export class InternacionesService {
  private internaciones: Internacion[] = [...INTERNACIONES];

  findAll(): Internacion[] {
    return this.internaciones;
  }

  create(internacion: Internacion): Internacion {
    this.internaciones.push(internacion);
    return internacion;
  }

  reset(): void {
    this.internaciones = [...INTERNACIONES];
  }
}
