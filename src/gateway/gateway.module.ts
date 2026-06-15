import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module'; 

import { JwtModule } from '@nestjs/jwt';
import { GatewayAdminController } from './gateway-admin.controller';
import { GatewayService } from './gateway.service';


@Module({
  imports: [HttpModule, AuthModule],
  controllers: [GatewayAdminController],
  providers: [GatewayService],
})
export class GatewayModule {}
