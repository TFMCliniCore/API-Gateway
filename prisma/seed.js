const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_CORE_URL =
  process.env.MS_ENTIDADES_CORE_URL || 'http://host.docker.internal:3001/api/v1';

const coreRoutes = [
  { pathPrefix: 'usuarios', description: 'Rutas de usuarios del microservicio de entidades core.' },
  { pathPrefix: 'clientes', description: 'Rutas de clientes del microservicio de entidades core.' },
  { pathPrefix: 'pacientes', description: 'Rutas de pacientes del microservicio de entidades core.' },
  { pathPrefix: 'roles', description: 'Rutas de roles del microservicio de entidades core.' },
  { pathPrefix: 'permisos', description: 'Rutas de permisos del microservicio de entidades core.' },
  { pathPrefix: 'sucursales', description: 'Rutas de sucursales del microservicio de entidades core.' }
];

async function main() {
  const service = await prisma.gatewayService.upsert({
    where: { serviceKey: 'entidades-core' },
    update: {
      displayName: 'MS Entidades Core',
      targetUrl: DEFAULT_CORE_URL,
      requiresAuth: false,
      isActive: true
    },
    create: {
      serviceKey: 'entidades-core',
      displayName: 'MS Entidades Core',
      targetUrl: DEFAULT_CORE_URL,
      requiresAuth: false,
      isActive: true
    }
  });

  for (const route of coreRoutes) {
    await prisma.gatewayRoute.upsert({
      where: { pathPrefix: route.pathPrefix },
      update: {
        description: route.description,
        isActive: true,
        serviceId: service.id
      },
      create: {
        ...route,
        isActive: true,
        serviceId: service.id
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Error ejecutando el seed del API Gateway:', error);
    await prisma.$disconnect();
    process.exit(1);
  });

