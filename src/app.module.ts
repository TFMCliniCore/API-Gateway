import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { GatewayModule } from './gateway/gateway.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
    imports: [
        // Configuración global de variables de entorno
        ConfigModule.forRoot({ isGlobal: true }),
        
        // Límite de peticiones (Rate Limiting) - 20 peticiones por minuto por IP
        ThrottlerModule.forRoot([{
            ttl: 60000, 
            limit: 20,
        }]),

        PrismaModule,
        AuthModule,
        GatewayModule,
        HealthModule,
        AuditoriaModule,
    ], 
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }