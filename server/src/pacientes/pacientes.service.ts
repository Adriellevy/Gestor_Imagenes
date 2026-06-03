import { Injectable } from '@nestjs/common';
import { PACIENTES } from '../data/seed';
import { Paciente } from '../data/types';

@Injectable()
export class PacientesService {
  findAll(): Paciente[] {
    return PACIENTES;
  }

  create(paciente: Paciente): Paciente {
    PACIENTES.push(paciente);
    return paciente;
  }
}
