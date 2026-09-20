import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Salud del Sistema')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Verificar el estado de operatividad de la Puerta de Enlace (API Gateway)' })
  @ApiResponse({ status: 200, description: 'El servicio se encuentra totalmente funcional (Healthy).' })
  @ApiResponse({ status: 503, description: 'El servicio experimenta degradación o fallas críticas.' })
  getHealth() {
    return this.healthService.getHealth();
  }
}