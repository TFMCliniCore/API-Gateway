import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FiltrosAuditoria {
  usuarioId?:  number;
  sucursalId?: number;
  accion?:     string;
  recurso?:    string;
  success?:    boolean;
  desde?:      string;
  hasta?:      string;
  page?:       number;
  limit?:      number;
}

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(filtros: FiltrosAuditoria = {}) {
    const {
      usuarioId, sucursalId, accion, recurso,
      success, desde, hasta,
      page = 1, limit = 50
    } = filtros;

    const where: Record<string, any> = {};

    if (usuarioId  !== undefined) where.usuarioId  = usuarioId;
    if (sucursalId !== undefined) where.sucursalId = sucursalId;
    if (accion)     where.accion  = accion;
    if (recurso)    where.recurso = recurso;
    if (success !== undefined) where.success = success;

    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt.gte = new Date(desde);
      if (hasta) where.createdAt.lte = new Date(hasta);
    }

    const skip  = (page - 1) * limit;
    const total = await this.prisma.gatewayRequestLog.count({ where });

    const logs = await this.prisma.gatewayRequestLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { service: { select: { serviceKey: true, displayName: true } } }
    });

    return {
      data: logs.map(l => ({
        id:          l.id,
        accion:      l.accion,
        recurso:     l.recurso,
        method:      l.method,
        path:        l.path,
        statusCode:  l.statusCode,
        success:     l.success,
        usuarioId:   l.usuarioId,
        sucursalId:  l.sucursalId,
        clientIp:    l.clientIp,
        detalle:     l.detalle,
        servicio:    l.service?.displayName ?? null,
        createdAt:   l.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async getEstadisticas(desde?: string, hasta?: string) {
    const where: Record<string, any> = {};
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt.gte = new Date(desde);
      if (hasta) where.createdAt.lte = new Date(hasta);
    }

    const [
      totalRequests,
      totalErrores,
      porAccion,
      porRecurso,
      porSucursal,
      ultimasHoras,
    ] = await Promise.all([
      // Total requests
      this.prisma.gatewayRequestLog.count({ where }),

      // Total errores
      this.prisma.gatewayRequestLog.count({ where: { ...where, success: false } }),

      // Agrupado por acción
      this.prisma.gatewayRequestLog.groupBy({
        by: ['accion'],
        where: { ...where, accion: { not: null } },
        _count: { accion: true },
        orderBy: { _count: { accion: 'desc' } }
      }),

      // Agrupado por recurso
      this.prisma.gatewayRequestLog.groupBy({
        by: ['recurso'],
        where: { ...where, recurso: { not: null } },
        _count: { recurso: true },
        orderBy: { _count: { recurso: 'desc' } },
        take: 10
      }),

      // Agrupado por sucursal
      this.prisma.gatewayRequestLog.groupBy({
        by: ['sucursalId'],
        where: { ...where, sucursalId: { not: null } },
        _count: { sucursalId: true },
        orderBy: { _count: { sucursalId: 'desc' } }
      }),

      // Últimas 24 horas agrupadas por hora
      this.prisma.$queryRaw<{ hora: string; total: bigint }[]>`
        SELECT
          to_char(date_trunc('hour', "createdAt"), 'HH24:MI') AS hora,
          COUNT(*)::bigint AS total
        FROM gateway_request_logs
        WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
        GROUP BY date_trunc('hour', "createdAt")
        ORDER BY date_trunc('hour', "createdAt") ASC
      `
    ]);

    return {
      resumen: {
        totalRequests,
        totalErrores,
        tasaExito: totalRequests > 0
          ? Math.round(((totalRequests - totalErrores) / totalRequests) * 100)
          : 100,
      },
      porAccion: porAccion.map(r => ({ accion: r.accion, total: r._count.accion })),
      porRecurso: porRecurso.map(r => ({ recurso: r.recurso, total: r._count.recurso })),
      porSucursal: porSucursal.map(r => ({ sucursalId: r.sucursalId, total: r._count.sucursalId })),
      ultimasHoras: ultimasHoras.map(r => ({ hora: r.hora, total: Number(r.total) })),
    };
  }

  async getLogsPorUsuario(usuarioId: number) {
    return this.getLogs({ usuarioId, limit: 100 });
  }

  async getLogsPorSucursal(sucursalId: number) {
    return this.getLogs({ sucursalId, limit: 100 });
  }
}
