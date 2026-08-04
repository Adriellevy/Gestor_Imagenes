import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  constructor(private readonly httpService: HttpService, private readonly config: ConfigService) {}

  async login(username: string, password: string) {
    const baseUrl = this.config.get<string>('GESTOR_GENERAL_URL', 'http://localhost:3020/api/v1');
    const response = await firstValueFrom(
      this.httpService.post(`${baseUrl}/auth/login`, { username, password }),
    );
    return response.data.data;
  }
}
