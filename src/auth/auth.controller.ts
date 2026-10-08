import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión y obtener token de acceso' })
  @ApiBody({
    description: 'Credenciales del usuario para ingresar a la plataforma',
    schema: {
      type: 'object',
      required: ['email', 'contrasena'],
      properties: {
        email: { type: 'string', format: 'email', example: 'veterinario@clinicore.com' },
        contrasena: { type: 'string', example: 'ClaveSegura2026' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Autenticación exitosa. Retorna información del usuario junto a su JWT.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas o cuenta inactiva.' })
  async login(@Body() body: { email: string; contrasena: string }) {
    const { email, contrasena } = body;
    return await this.authService.login(email, contrasena);
  }
}