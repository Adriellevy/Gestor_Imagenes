import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoEstudio } from './entities/tipo-estudio.entity';

@Injectable()
export class TiposEstudioService {
  constructor(
    @InjectRepository(TipoEstudio)
    private readonly tiposEstudioRepository: Repository<TipoEstudio>,
  ) {}

  findAll(): Promise<TipoEstudio[]> {
    return this.tiposEstudioRepository.find({ where: { tipo: 'IMG' } });
  }
}
