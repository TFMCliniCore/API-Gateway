import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { urlencoded, json, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GatewayService } from './gateway/gateway.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Seguridad (Helmet adaptado para servir estáticos entre dominios)
  app.use(helmet({
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    xssFilter: true,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  }));

  // 2. CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN === '*' ? true : process.env.CORS_ORIGIN?.split(',') ?? true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false })
  );

  app.enableShutdownHooks();

  // 3. Body parsers estándar (sólo JSON y form-urlencoded hasta 10mb)
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // 4. Proxy del gateway con manejo seguro de errores
  const gatewayService = app.get(GatewayService);
  app.use('/api/v1', async (request: Request, response: Response, next: NextFunction) => {
    try {
      await gatewayService.handleProxyRequest(request, response, next);
    } catch (err) {
      next(err);
    }
  });

  // 5. Arranque
  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port);
  console.log(`🚀 Gateway corriendo en: http://localhost:${port}/api/v1`);
}
bootstrap();