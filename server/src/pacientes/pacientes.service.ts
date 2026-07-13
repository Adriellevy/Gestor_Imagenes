import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PACIENTES, PADRON_HOSPITAL } from '../data/seed';
import { Paciente } from './entities/paciente.entity';

@Injectable()
export class PacientesService {
  constructor(
    @InjectRepository(Paciente)
    private readonly pacientesRepository: Repository<Paciente>,
  ) {}

  findAll(): Promise<Paciente[]> {
    return this.pacientesRepository.find();
  }

  getPadron(): any[] {
    return PADRON_HOSPITAL;
  }

  create(paciente: Paciente): Promise<Paciente> {
    return this.pacientesRepository.save(paciente);
  }

  async reset(): Promise<void> {
    await this.pacientesRepository.createQueryBuilder().delete().execute();
    await this.pacientesRepository.save(PACIENTES as Paciente[]);
  }
}
