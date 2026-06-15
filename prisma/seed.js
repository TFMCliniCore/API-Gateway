const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_CORE_URL =
  process.env.MS_ENTIDADES_CORE_URL || 'http://host.docker.internal:3001/api/v1';

const DEFAULT_AGENDA_URL =
  process.env.MS_AGENDA_URL || 'http://host.docker.internal:3003/api/v1';

const DEFAULT_MULTISUCURSAL_URL =
  process.env.MS_MULTISUCURSAL_URL || 'http://host.docker.internal:3004/api/v1';

const DEFAULT_HISTORIA_CLINICA_URL =
  process.env.MS_HISTORIA_CLINICA_URL || 'http://host.docker.internal:3005/api/v1';

const DEFAULT_INVENTARIO_URL =
  process.env.MS_INVENTARIO_URL || 'http://host.docker.internal:3007/api/v1';

// 🚀 Nueva constante para el Microservicio de Ventas (Puerto 3008)
const DEFAULT_VENTAS_URL =
  process.env.VENTAS_MS_URL || 'http://host.docker.internal:3008/api/v1';

const coreRoutes = [
  { pathPrefix: 'auth',       description: 'Rutas de autenticación (Login, Recuperación, etc).' }, 
  { pathPrefix: 'usuarios',   description: 'Rutas de usuarios del microservicio de entidades core.' },
  { pathPrefix: 'clientes',   description: 'Rutas de clientes del microservicio de entidades core.' },
  { pathPrefix: 'pacientes',  description: 'Rutas de pacientes del microservicio de entidades core.' },
  { pathPrefix: 'roles',      description: 'Rutas de roles del microservicio de entidades core.' },
  { pathPrefix: 'permisos',   description: 'Rutas de permisos del microservicio de entidades core.' },
  { pathPrefix: 'sucursales', description: 'Rutas de sucursales del microservicio de entidades core.' }
];

const agendaRoutes = [
  { pathPrefix: 'citas',         description: 'Rutas de citas del microservicio de agenda.' },
  { pathPrefix: 'recordatorios', description: 'Rutas de recordatorios del microservicio de agenda.' },
  { pathPrefix: 'sala-espera',   description: 'Rutas de sala de espera del microservicio de agenda.' }
];

const multisucursalRoutes = [
  { pathPrefix: 'asignaciones', description: 'Rutas de asignación de usuarios a sucursales.' }
];

const historiaClinicaRoutes = [
  { pathPrefix: 'historias',     description: 'Rutas de gestión de historias clínicas.' },
  { pathPrefix: 'ficha',         description: 'Rutas de fichas clínicas y exportación de PDFs.' }
];

const inventarioRoutes = [
{ pathPrefix: 'productos',         description: 'CRUD de productos del MS Inventario.' },
{ pathPrefix: 'categorias',        description: 'CRUD de categorías del MS Inventario.' },
{ pathPrefix: 'movimientos-stock', description: 'Movimientos de stock del MS Inventario.' },
{ pathPrefix: 'uploads',           description: 'Archivos estáticos (imágenes) del MS Inventario.' },
];

// 🚀 Nuevas rutas asociadas al módulo de Ventas
const ventasRoutes = [
  { pathPrefix: 'promociones',    description: 'Rutas de reglas de promoción y vigencias.' },
  { pathPrefix: 'ventas',         description: 'Rutas de gestión de facturas e historial de ventas.' },
  { pathPrefix: 'cierres-caja',   description: 'Rutas de turnos, apertura y cierres de caja.' },
  { pathPrefix: 'precios',        description: 'Rutas de simulación e historial de variación de precios.' },
  
  // 🚀 Variantes por si el proxy del Gateway no remueve correctamente el segmento v1 internamente
  { pathPrefix: 'v1/promociones', description: 'Variante v1 para promociones.' },
  { pathPrefix: 'v1/ventas',      description: 'Variante v1 para ventas.' },
  { pathPrefix: 'v1/cierres-caja',description: 'Variante v1 para cierres de caja.' },
  { pathPrefix: 'v1/precios',     description: 'Variante v1 para precios.' }
];

async function registerService(serviceKey, displayName, targetUrl, routes) {
  const service = await prisma.gatewayService.upsert({
    where: { serviceKey },
    update: { displayName, targetUrl, requiresAuth: false, isActive: true },
    create: { serviceKey, displayName, targetUrl, requiresAuth: false, isActive: true }
  });

  for (const route of routes) {
    await prisma.gatewayRoute.upsert({
      where: { pathPrefix: route.pathPrefix },
      update: { description: route.description, isActive: true, serviceId: service.id },
      create: { ...route, isActive: true, serviceId: service.id }
    });
  }

  console.log('Registrado:', displayName, '- rutas:', routes.map(r => r.pathPrefix).join(', '));
}

async function main() {
  await registerService('entidades-core',   'MS Entidades Core',     DEFAULT_CORE_URL,             coreRoutes);
  await registerService('agenda',           'MS Agenda',             DEFAULT_AGENDA_URL,           agendaRoutes);
  await registerService('multisucursal',    'MS Multisucursal',      DEFAULT_MULTISUCURSAL_URL,    multisucursalRoutes);
  await registerService('historia-clinica', 'MS Historia Clínica',   DEFAULT_HISTORIA_CLINICA_URL, historiaClinicaRoutes);
  await registerService('inventario',       'MS Inventario',         DEFAULT_INVENTARIO_URL,       inventarioRoutes);
  
  // 🚀 Registramos el nuevo servicio en la ejecución principal
  await registerService('ventas',           'MS Ventas',             DEFAULT_VENTAS_URL,           ventasRoutes);
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