import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GatewayService } from './gateway/gateway.service';
import { urlencoded, json, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Prefijo Global
  app.setGlobalPrefix('api/v1');

  // 2. Body Parsers (CRÍTICO: Debe ir antes de cualquier middleware o del listen)
  // Esto permite que req.body no llegue vacío al AuthController
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));

  // 3. CORS
  app.enableCors({
    origin: 'http://localhost:3000',
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
      forbidNonWhitelisted: false
    })
  );

  // 6. Middleware del Gateway (Maneja la redirección a otros microservicios)
  const gatewayService = app.get(GatewayService);
  
  app.use(async (req: Request, res: Response, next: NextFunction) => {
  // Usamos originalUrl para asegurar que pescamos el prefijo /api/v1/auth
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

  // 7. LISTEN (Única llamada y al final del archivo)
  
  
  console.log('--------------------------------------------------');
  console.log('🚀 API GATEWAY - MS_Entidades-Core');
  console.log('📍 Endpoint: http://localhost:3002/api/v1');
  console.log('--------------------------------------------------');
  await app.listen(3002);
}
bootstrap();