import { Controller, Get } from '@nestjs/common';

import { GatewayService } from './gateway.service';

@Controller('gateway')
export class GatewayAdminController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Get('services')
  getServices() {
    return this.gatewayService.getRegisteredServices();
  }

  @Get('routes')
  getRoutes() {
    return this.gatewayService.getRegisteredRoutes();
  }
}
