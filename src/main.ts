import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { GatewayService } from './gateway/gateway.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Prefijo Global
  app.setGlobalPrefix('api/v1');

  // 2. Body Parsers (CRÍTICO: Permite que req.body no llegue vacío al Gateway o subida de archivos)
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // 3. CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 4. Seguridad básica
  app.use(helmet({
    hidePoweredBy: true,
    xssFilter: true,
  }));

  // 5. Pipes de Validación Globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  // 6. Middleware del Gateway (Maneja la redirección controlada a los microservicios)
  const gatewayService = app.get(GatewayService);
  
  app.use('/api/v1', async (req: Request, res: Response, next: NextFunction) => {
    // Excluir endpoints locales del Gateway (status de auth y health checks automatizados)
    if (req.originalUrl.includes('/auth/status') || req.originalUrl.includes('/health')) {
      return next();
    }
    
    try {
      await gatewayService.handleProxyRequest(req, res, next);
    } catch (error) {
      next(error);
    }
  });

  app.enableShutdownHooks();

  // 7. INICIO DEL SERVIDOR (Usa el puerto del entorno o por defecto el 3002)
  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port);
  
  console.log('--------------------------------------------------');
  console.log(`🚀 API GATEWAY - CliniCore corriendo exitosamente`);
  console.log(`📍 URL: http://localhost:${port}/api/v1`);
  console.log('--------------------------------------------------');
}
bootstrap();