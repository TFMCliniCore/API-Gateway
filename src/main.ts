import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { urlencoded, json } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GatewayService } from './gateway/gateway.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Seguridad
  app.use(helmet({
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    xssFilter: true,
    // El gateway sirve recursos (imágenes, archivos) a frontends en otros orígenes.
    // "same-origin" bloquea cross-origin img/fetch desde el browser → se necesita "cross-origin".
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Permitir que frontends de otros orígenes embeds recursos del gateway.
    crossOriginEmbedderPolicy: false,
  }));

  // 2. CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN === '*' ? true : process.env.CORS_ORIGIN?.split(',') ?? true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false })
  );

  app.enableShutdownHooks();

  // 3. Body parsers (sólo JSON y form-urlencoded; multipart/form-data se deja sin tocar)
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // 4. Proxy del gateway
  const gatewayService = app.get(GatewayService);
  app.use('/api/v1', async (request: Request, response: Response, next: NextFunction) => {
    try {
      await gatewayService.handleProxyRequest(request, response, next);
    } catch (error) {
      next(error);
    }
  });

  // 5. Arranque
  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port);
  console.log(`🚀 Gateway corriendo en: http://localhost:${port}/api/v1`);
}

bootstrap();
