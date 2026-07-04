import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GatewayService } from './gateway.service';

@ApiTags('Administración del API Gateway')
@Controller('gateway')
export class GatewayAdminController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Get('services')
  @ApiOperation({ summary: 'Listar microservicios registrados en el clúster' })
  @ApiResponse({ status: 200, description: 'Estructura e información de servicios dinámicos recuperada.' })
  getServices() {
    return this.gatewayService.getRegisteredServices();
  }

  @Get('routes')
  @ApiOperation({ summary: 'Listar mapa dinámico de rutas activas asignadas a microservicios' })
  @ApiResponse({ status: 200, description: 'Mapa de enrutamiento del proxy obtenido con éxito.' })
  getRoutes() {
    return this.gatewayService.getRegisteredRoutes();
  }
  
}