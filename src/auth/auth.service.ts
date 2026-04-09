import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  getStatus() {
    return {
      enabled: false,
      mode: 'not-implemented-yet',
      provider: 'passport',
      strategy: 'jwt',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      message:
        'JWT y Passport quedaron preparados en la estructura del gateway, pero las rutas aun no requieren autenticacion.'
    };
  }
}

