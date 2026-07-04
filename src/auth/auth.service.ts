import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios'; 
import { JwtService } from '@nestjs/jwt'; // 👈 1. Importamos el generador de tokens de NestJS
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  // 👈 2. Inyectamos JwtService en el constructor junto al HttpService
  constructor(
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService 
  ) {}

  async login(email: string, password: string) {
    const baseUrl = process.env.MS_ENTIDADES_CORE_URL;
    console.log('🔍 [Gateway] Intentando conectar usando MS_ENTIDADES_CORE_URL:', baseUrl);

    if (!baseUrl) {
      throw new Error('La variable de entorno MS_ENTIDADES_CORE_URL no está configurada correctamente.');
    }

    try {
      const payloadDestino = {
        email: email,
        contrasena: password 
      };

      const urlCore = `${baseUrl.replace(/\/$/, '')}/usuarios/login`; 
      console.log('🚀 [Gateway] Enviando POST a:', urlCore);
      
      const response = await lastValueFrom(
        this.httpService.post(urlCore, payloadDestino)
      );

      // 🎯 Guardamos el usuario devuelto por el microservicio de entidades
      const usuario = response.data;

      // 🔑 3. Creamos el contenido (payload) que llevará el JWT
      const payloadJwt = {
        id: usuario.id,
        email: usuario.email,
        nombres: usuario.nombres,
        rolId: usuario.rolId,
        sucursalId: usuario.sucursalId
      };

      // ✍️ 4. Firmamos el token usando la clave secreta configurada en el módulo
      const token = this.jwtService.sign(payloadJwt);

      // 🚀 5. Retornamos la estructura EXACTA que el frontend está esperando leer
      return {
        access_token: token,
        usuario: usuario
      };

    } catch (error: any) {
      console.error('🔴 Error detallado proveniente del Core:', error.response?.data || error.message);
      
      throw new UnauthorizedException({
        message: 'Credenciales incorrectas en el ecosistema.',
        error: 'Unauthorized',
        statusCode: 401
      });
    }
  }
}