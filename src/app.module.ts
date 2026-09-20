import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common'; 
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { GatewayModule } from './gateway/gateway.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { GatewayService } from './gateway/gateway.service'; 

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
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
export class AppModule implements NestModule { 
    constructor(private readonly gatewayService: GatewayService) {} // 👈 Esto ahora funcionará perfecto

    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply((req: any, res: any, next: any) => {
                this.gatewayService.handleProxyRequest(req, res, next);
            })
            .forRoutes({ path: '*', method: RequestMethod.ALL }); 
    }
}