import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    await this.prisma.$queryRaw`SELECT 1`;

    const activeRoutes = await this.prisma.gatewayRoute.count({
      where: {
        isActive: true,
        service: {
          isActive: true
        }
      }
    });

    return {
      service: 'clinicore-api-gateway',
      status: 'ok',
      port: Number(process.env.PORT ?? 3002),
      auth: {
        enabled: false,
        provider: 'passport',
        strategy: 'jwt'
      },
      database: 'up',
      activeRoutes,
      timestamp: new Date().toISOString()
    };
  }
}

