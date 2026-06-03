import { Injectable } from '@nestjs/common';
import { INTERNACIONES } from '../data/seed';
import { Internacion } from '../data/types';

@Injectable()
export class InternacionesService {
  findAll(): Internacion[] {
    return INTERNACIONES;
  }

  create(internacion: Internacion): Internacion {
    INTERNACIONES.push(internacion);
    return internacion;
  }
}
