import 'dotenv/config';
import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { GatewayService } from './gateway/gateway.service';
import * as express from 'express';
import { urlencoded, json } from 'express';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Configuración de Seguridad (Helmet)
  app.use(helmet({
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    xssFilter: true,
  }));

  // 2. CONFIGURACIÓN DE CORS (Antes de los middlewares de ruta)
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 3. BODY PARSERS (¡ESTO DEBE IR ANTES DEL GATEWAY!)
  app.use(json({ limit: '1mb' })); 
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // 4. MIDDLEWARE DEL GATEWAY
  const gatewayService = app.get(GatewayService);
  app.use('/api/v1', async (request: Request, response: Response, next: NextFunction) => {
    try {
      await gatewayService.handleProxyRequest(request, response, next);
    } catch (error) {
      next(error);
    }
  });

  // 5. INICIO DEL SERVIDOR
  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port);
  console.log(`🚀 Gateway corriendo en: http://localhost:${port}/api/v1`);  
}

bootstrap();
