import { Injectable } from '@nestjs/common';
import { USUARIOS } from '../data/seed';
import { Usuario } from '../data/types';

@Injectable()
export class UsuariosService {
  findAll(): Usuario[] {
    return USUARIOS;
  }
}
