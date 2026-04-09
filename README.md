# CliniCore API Gateway

Proyecto NestJS independiente que actua como API Gateway para centralizar las peticiones del frontend y canalizarlas hacia los microservicios del ecosistema CliniCore.


## Responsabilidades

- Recibir peticiones del frontend por el puerto `3002` (local)
- Exponer un punto de entrada unificado para los recursos de negocio
- Registrar en PostgreSQL las rutas disponibles y un log basico de peticiones
- Preparar la base tecnica para `JWT` y `Passport` sin exigir autenticacion todavia
- Redirigir las llamadas a los diferentes microservicios

## Stack

- NestJS
- Prisma ORM
- PostgreSQL 16
- Docker / Docker Compose
- TypeScript

## Variables de entorno

Crear el archivo `.env` a partir de `.env.example`:

```env
PORT=
POSTGRES_PORT=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=api_gateway
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN="15m"
MS_ENTIDADES_CORE_URL=
CORS_ORIGIN="*"
```

## Ejecucion con Docker

```bash
docker compose up --build
```

Servicios expuestos:

- API Gateway: `http://localhost:3002` (para desarrollo)
- PostgreSQL del Gateway: `localhost:5432`

Al iniciar el contenedor del gateway se ejecutan:

1. Migraciones Prisma
2. Seed con la configuracion inicial de rutas
3. Arranque del servidor NestJS

## Ejecucion local

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

## Rutas registradas inicialmente

El seed registra el microservicio `entidades-core` con estos prefijos:

- `usuarios`
- `clientes`
- `pacientes`
- `roles`
- `permisos`
- `sucursales`

Eso permite que el frontend consuma el gateway manteniendo rutas como:

- `GET /api/v1/usuarios`
- `POST /api/v1/clientes`
- `DELETE /api/v1/pacientes/10`


## Endpoints propios del Gateway

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| GET | `/api/v1/health` | Salud del gateway y conexion a base de datos |
| GET | `/api/v1/auth/status` | Estado actual del modulo JWT/Passport |
| GET | `/api/v1/gateway/services` | Lista de microservicios registrados en el gateway |
| GET | `/api/v1/gateway/routes` | Lista de prefijos y microservicios registrados |
| GET, POST, PUT, PATCH, DELETE | `/api/v1/:resource` | Rutas para recursos raiz registrados |
| GET, POST, PUT, PATCH, DELETE | `/api/v1/:resource/*` | Rutas para rutas anidadas registradas |

## Estructura de base de datos

El gateway usa PostgreSQL con Prisma para:

- `gateway_services`: microservicios registrados
- `gateway_routes`: prefijos publicados por cada microservicio
- `gateway_request_logs`: auditoria basica de peticiones encaminadas

## JWT y Passport

Las dependencias y el modulo base quedan creados, pero todavia no se aplican guards ni validaciones de token.


## Docker y despliegue

Este proyecto tiene su propio:

- `Dockerfile`
- `docker-compose.yml`
- `.env.example`
- `prisma/`