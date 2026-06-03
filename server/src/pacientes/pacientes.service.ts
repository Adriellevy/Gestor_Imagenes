import { Injectable } from '@nestjs/common';
import { PACIENTES, PADRON_HOSPITAL } from '../data/seed';
import { Paciente } from '../data/types';

@Injectable()
export class PacientesService {
  private pacientes: Paciente[] = [...PACIENTES];

  findAll(): Paciente[] {
    return this.pacientes;
  }

  getPadron(): any[] {
    return PADRON_HOSPITAL;
  }

  create(paciente: Paciente): Paciente {
    this.pacientes.push(paciente);
    return paciente;
  }

  reset(): void {
    this.pacientes = [...PACIENTES];
  }
}
