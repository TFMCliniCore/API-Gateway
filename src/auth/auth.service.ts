import { HttpService } from '@nestjs/axios';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
  ) {}

  async login(email: string, password: string) {
    const coreUrl = this.configService.get<string>('MS_ENTIDADES_CORE_URL');

    try {
      const { data: usuario } = await firstValueFrom(
        this.httpService.post(`${coreUrl}/usuarios/login`, {
          email,
          contrasena: password,
        }),
      );

      const payload = {
        sub: usuario.id,
        email: usuario.email,
        nombres: usuario.nombres,
        rolId: usuario.rolId,
        sucursalId: usuario.sucursalId,
      };

      const token = this.jwtService.sign(payload);

      return { access_token: token, usuario };
    } catch {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }
  }

  getStatus() {
    return {
      enabled: true,
      mode: 'jwt-login',
      provider: 'passport',
      strategy: 'jwt',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    };
  }
}