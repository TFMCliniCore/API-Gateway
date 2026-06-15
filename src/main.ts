import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';
import { GatewayService } from './gateway/gateway.service';

import express, {
  json,
  urlencoded,
  Request,
  Response,
  NextFunction,
} from 'express';

import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Seguridad
  app.use(
    helmet({
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
    }),
  );

  // CORS
  app.enableCors({
    origin:
      process.env.CORS_ORIGIN === '*'
        ? true
        : process.env.CORS_ORIGIN?.split(',') ?? true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  // Validation Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.enableShutdownHooks();

  // Body parsers
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Gateway
  const gatewayService = app.get(GatewayService);

  app.use(
    '/api/v1',
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        await gatewayService.handleProxyRequest(
          request,
          response,
          next,
        );
      } catch (error) {
        next(error);
      }
    },
  );

  // Inicio servidor
  const port = Number(process.env.PORT ?? 3002);

  await app.listen(port);

  console.log(
    `🚀 Gateway corriendo en: http://localhost:${port}/api/v1`,
  );
}

bootstrap();