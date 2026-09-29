import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios'; 
import { JwtService } from '@nestjs/jwt';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
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

      // 🎯 Corrección: Cambiado de '/auth/login' a '/usuarios/login'
      const urlCore = `${baseUrl.replace(/\/$/, '')}/usuarios/login`;
      console.log('🚀 [Gateway] Enviando POST a:', urlCore);
      
      const response = await lastValueFrom(
        this.httpService.post(urlCore, payloadDestino)
      );

      // Guardamos el usuario devuelto por el microservicio de entidades
      const usuario = response.data;

      // Creamos el contenido (payload) que llevará el JWT
      const payloadJwt = {
        id: usuario.id,
        email: usuario.email,
        nombres: usuario.nombres,
        rolId: usuario.rolId,
        sucursalId: usuario.sucursalId
      };

      // Firmamos el token usando la clave secreta configurada en el módulo
      const token = this.jwtService.sign(payloadJwt);

      // Retornamos la estructura que el frontend espera
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