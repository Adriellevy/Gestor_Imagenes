import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { INTERNACIONES } from '../data/seed';
import { Internacion } from './entities/internacion.entity';

@Injectable()
export class InternacionesService {
  constructor(
    @InjectRepository(Internacion)
    private readonly internacionesRepository: Repository<Internacion>,
  ) {}

  findAll(): Promise<Internacion[]> {
    return this.internacionesRepository.find();
  }

  create(internacion: Internacion): Promise<Internacion> {
    return this.internacionesRepository.save(internacion);
  }

  async updateUbicacion(id: string, cama: string, sector?: string): Promise<Internacion | null> {
    const internacion = await this.internacionesRepository.findOneBy({ id });
    if (!internacion) return null;

    internacion.ubicacion = {
      ...internacion.ubicacion,
      cama,
      ...(sector ? { sector } : {}),
    };

    return this.internacionesRepository.save(internacion);
  }

  async reset(): Promise<void> {
    await this.internacionesRepository.createQueryBuilder().delete().execute();
    await this.internacionesRepository.save(INTERNACIONES as Internacion[]);
  }
}
