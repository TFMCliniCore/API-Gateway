import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { GatewayAdminController } from './gateway-admin.controller';
import { GatewayService } from './gateway.service';

@Module({
  imports: [HttpModule],
  controllers: [GatewayAdminController],
  providers: [GatewayService]
})
export class GatewayModule {}
