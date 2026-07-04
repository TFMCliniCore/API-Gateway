import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; 
import { AppModule } from './app.module';
import { GatewayService } from './gateway/gateway.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Prefijo Global
  app.setGlobalPrefix('api/v1');

  // 2. CORS
  const rawOrigin = process.env.CORS_ORIGIN;
  const allowedOrigins = rawOrigin && rawOrigin.trim() !== '*' && rawOrigin.trim() !== ''
    ? rawOrigin.split(',').map(o => o.trim())
    : true;

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 3. Seguridad (Helmet configurado para permitir los scripts/estilos inline de Swagger UI)
  app.use(helmet({
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    xssFilter: true,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: { 
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        scriptSrc: [`'self'`, `'unsafe-inline'`, `https:`],
      },
    },
  }));

  // 4. Configuración de la documentación base del Gateway
  const config = new DocumentBuilder()
    .setTitle('CliniCore - API Gateway')
    .setDescription('Puerta de enlace principal del ecosistema CliniCore')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // 🎯 5. CONFIGURACIÓN DE AGREGACIÓN UNIFICADA EXPANDIDA
  SwaggerModule.setup('api/v1/docs', app, document, {
    explorer: true, 
    swaggerOptions: {
      urls: [
        {
          url: '/api/v1/docs-json', 
          name: 'Core Gateway (Autenticación y Auditoría)'
        },
        {
          url: '/api/v1/ventas/docs-json-proxy', 
          name: 'MS Ventas y Facturación'
        },
        {
          url: '/api/v1/productos/docs-json-proxy', 
          name: 'MS Inventario y Stock'
        },
        {
          url: '/api/v1/usuarios/docs-json-proxy', 
          name: 'MS Entidades Core (Usuarios y Pacientes)'
        },
        {
          url: '/api/v1/citas/docs-json-proxy', 
          name: 'MS Agenda y Citas'
        },
        {
          url: '/api/v1/agenda-docs/docs-json-proxy', // 🚀 NUEVO: Proxy de documentación del CRUD Agenda
          name: 'MS CRUD Agenda Base'
        },
        {
          url: '/api/v1/historia-clinica/docs-json-proxy', 
          name: 'MS Historia Clínica'
        },
        {
          url: '/api/v1/telemedicina/docs-json-proxy', 
          name: 'MS Telemedicina y Video'
        },
        {
          url: '/api/v1/reportes/docs-json-proxy', 
          name: 'MS Reportes y Analítica'
        },
        {
          url: '/api/v1/integraciones/docs-json-proxy', 
          name: 'MS Integraciones Externas'
        },
        {
          url: '/api/v1/multisede/docs-json-proxy', 
          name: 'MS Configuración Multisede'
        }
      ],
    },
    // Estilos limpios para asegurar que se vea impecable la barra y el select drop-down
    customCss: `
      .swagger-ui .topbar { 
        display: block !important; 
        background-color: #1b1b1b !important; 
        padding: 8px 0;
      }
      .swagger-ui .topbar .download-url-wrapper {
        display: flex !important;
        align-items: center;
      }
      /* Esconde la caja de texto de búsqueda manual para dejar limpio solo el selector */
      .swagger-ui .topbar .download-url-wrapper input,
      .swagger-ui .topbar .download-url-wrapper .download-url-button {
        display: none !important; 
      }
    `,
    customSiteTitle: 'CliniCore - API Documentación',
  });

  // 6. Arranque
  const port = Number(process.env.PORT ?? 3000); 
  
  await app.listen(port, '0.0.0.0'); 
  
  const publicPort = process.env.PUBLIC_PORT ?? port;

  console.log(`🚀 Gateway corriendo internamente en el puerto: ${port}`);
  console.log(`📝 Documentación disponible en: http://localhost:${publicPort}/api/v1/docs`);
}

bootstrap();