import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GatewayAdminController } from './gateway-admin.controller';
import { GatewayService } from './gateway.service';

@Module({
  imports: [HttpModule, JwtModule.register({
      secret: process.env.JWT_SECRET, // Toma "CLAVE_SECRETA_PARA_EL_GATEWAY"[cite: 5]
    }),],
  controllers: [GatewayAdminController],
  providers: [GatewayService],
})
export class GatewayModule {}
