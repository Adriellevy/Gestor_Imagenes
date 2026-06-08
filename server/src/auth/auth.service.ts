import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/usuarios.service';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService
  ) {}

  async login(userId: string) {
    const user = this.usuariosService.findAll().find(u => u.id === userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    const payload = { sub: user.id, rol: user.rol };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: user
    };
  }
}
