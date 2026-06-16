# CliniCore API Gateway

Proyecto NestJS que actúa como API Gateway del ecosistema CliniCore: centraliza las peticiones del frontend, gestiona la autenticación JWT y enruta el tráfico hacia los microservicios.

## Responsabilidades

- Recibir peticiones del frontend por el puerto `3002` (desarrollo local)
- Emitir y validar tokens JWT para autenticación
- Enrutar llamadas hacia los microservicios registrados
- Registrar en PostgreSQL las rutas disponibles y un log básico de peticiones

## Stack

- NestJS
- Prisma ORM
- PostgreSQL 16
- Docker / Docker Compose
- TypeScript
- `@nestjs/jwt` + `@nestjs/passport`
- `@nestjs/axios` (proxy HTTP hacia microservicios)

## Variables de entorno

Crear el archivo `.env` a partir de `.env.example`:

```env
PORT=3002
POSTGRES_PORT=5433
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=api_gateway
DATABASE_URL=postgresql://user:pass@db:5432/api_gateway
JWT_SECRET=tu_secreto_seguro
JWT_EXPIRES_IN=15m
MS_ENTIDADES_CORE_URL=http://host.docker.internal:3001/api/v1
CORS_ORIGIN=http://localhost:3000
```

> `MS_ENTIDADES_CORE_URL` usa `host.docker.internal` para alcanzar el microservicio desde dentro del contenedor Docker del Gateway.

## Ejecución con Docker

```bash
docker compose up --build
```

Servicios expuestos:

- API Gateway: `http://localhost:3002`
- PostgreSQL del Gateway: `localhost:5433`

Al iniciar el contenedor se ejecutan automáticamente:

1. Migraciones Prisma
2. Seed con la configuración inicial de rutas
3. Arranque del servidor NestJS

## Ejecución local

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

## Autenticación JWT

El Gateway es el único punto que emite tokens JWT. El flujo es:

```
Frontend → POST /api/v1/auth/login → Gateway
                                        ↓
                           POST /usuarios/login → MS_Entidades-Core
                                        ↓
                           Valida bcrypt + devuelve usuario
                                        ↓
                           Gateway firma JWT (payload: id, email, nombres, rolId, sucursalId)
                                        ↓
Frontend ← { access_token, usuario }
```

El token tiene una vigencia de **15 minutos** (`JWT_EXPIRES_IN`). Las rutas proxy exigen el header:

```
Authorization: Bearer <access_token>
```

## Endpoints propios del Gateway

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | No | Estado del gateway y conexión a base de datos |
| GET | `/api/v1/auth/status` | No | Información del módulo JWT/Passport |
| POST | `/api/v1/auth/login` | No | Validación de credenciales y emisión de token JWT |
| GET | `/api/v1/gateway/services` | No | Microservicios registrados |
| GET | `/api/v1/gateway/routes` | No | Prefijos y microservicios registrados |

### POST `/api/v1/auth/login`

**Body:**
```json
{
  "email": "admin@clinicavet.test",
  "password": "MiContrasena123"
}
```

**Respuesta exitosa (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nombres": "Administrador Principal",
    "email": "admin@clinicavet.test",
    "celular": "3001234567",
    "cargo": "Administrador",
    "foto": "/api/v1/usuarios/foto/usuario_1_abc123.jpg",
    "rolId": 1,
    "sucursalId": 1,
    "rol": { "id": 1, "nombre": "Admin" },
    "sucursal": { "id": 1, "nombre": "Sede Central" }
  }
}
```

**Credenciales incorrectas (401):**
```json
{
  "statusCode": 401,
  "message": "Credenciales incorrectas."
}
```

## Endpoints proxy (enrutados a microservicios)

Todas las rutas bajo `/api/v1/:recurso` requieren `Authorization: Bearer <token>` y se enrutan al microservicio correspondiente según la tabla de rutas registrada.

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET, POST, PUT, PATCH, DELETE | `/api/v1/:resource` | Recursos raíz registrados |
| GET, POST, PUT, PATCH, DELETE | `/api/v1/:resource/*` | Rutas anidadas registradas |

### Prefijos registrados en el seed (→ MS_Entidades-Core)

- `usuarios`
- `clientes`
- `pacientes`
- `roles`
- `permisos`
- `sucursales`

Ejemplos de uso con token:

```
GET  /api/v1/usuarios              → lista usuarios
POST /api/v1/usuarios/1/foto       → sube foto de usuario
GET  /api/v1/usuarios/foto/img.jpg → sirve foto (no requiere auth)
GET  /api/v1/roles                 → lista roles
```

## Colección Postman

```text
postman/
  CliniCore_API_Gateway.postman_collection.json
```

La variable `baseUrl` viene configurada como `http://localhost:3002/api/v1`.  
Tras ejecutar **Login**, copia el `access_token` en la variable de colección `token` para autenticar el resto de peticiones.

## Estructura de base de datos (Gateway)

| Tabla | Contenido |
| --- | --- |
| `gateway_services` | Microservicios registrados |
| `gateway_routes` | Prefijos publicados por cada microservicio |
| `gateway_request_logs` | Auditoría básica de peticiones enrutadas |

## Configuración de Correo (Nodemailer / Mailtrap)

```env
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=tu_usuario_de_mailtrap
MAIL_PASS=tu_password_de_mailtrap
MAIL_FROM="CliniCore <no-reply@clinicore.test>"
```

> Se recomienda Mailtrap para capturar correos salientes en desarrollo sin enviarlos a cuentas reales.

## Docker y despliegue

Este proyecto tiene su propio:

- `Dockerfile`
- `docker-compose.yml`
- `.env.example`
- `prisma/`
