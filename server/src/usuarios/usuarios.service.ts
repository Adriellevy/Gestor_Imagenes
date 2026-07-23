import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { USUARIOS } from '../data/seed';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  findAll(): Promise<Usuario[]> {
    return this.usuariosRepository.find();
  }

  upsert(usuario: Usuario): Promise<Usuario> {
    return this.usuariosRepository.save(usuario);
  }

  async reset(): Promise<void> {
    await this.usuariosRepository.createQueryBuilder().delete().execute();
    await this.usuariosRepository.save(USUARIOS as unknown as Usuario[]);
  }
}
