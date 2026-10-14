import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module'; 

import { JwtModule } from '@nestjs/jwt';
import { GatewayAdminController } from './gateway-admin.controller';
import { GatewayService } from './gateway.service';
import { GatewayProxyController } from './gateway-proxy.controller';

@Module({
  imports: [HttpModule, AuthModule],
  controllers: [GatewayAdminController, GatewayProxyController],
  providers: [GatewayService],
  exports: [GatewayService], 
})
export class GatewayModule {}