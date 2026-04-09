import { HttpService } from '@nestjs/axios';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { GatewayRoute, GatewayService as GatewayServiceModel } from '@prisma/client';
import type { AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import type { NextFunction, Request, Response } from 'express';

import { PrismaService } from '../prisma/prisma.service';

type RouteWithService = GatewayRoute & {
  service: GatewayServiceModel;
};

@Injectable()
export class GatewayService {
  private readonly internalPrefixes = [
    '/health',
    '/auth/status',
    '/gateway/services',
    '/gateway/routes'
  ];

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService
  ) {}

  async handleProxyRequest(request: Request, response: Response, next: NextFunction) {
    const normalizedPath = this.extractGatewayPath(request);

    if (this.isInternalPath(normalizedPath)) {
      return next();
    }

    const [resource, ...segments] = normalizedPath.replace(/^\/+/, '').split('/');

    if (!resource) {
      return next();
    }

    try {
      return await this.forwardRequest(
        resource,
        segments.length > 0 ? segments.join('/') : undefined,
        request,
        response
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        return response.status(404).json({
          message: error.message,
          error: 'Not Found',
          statusCode: 404
        });
      }

      return next(error);
    }
  }

  async getRegisteredServices() {
    const services = await this.prisma.gatewayService.findMany({
      where: {
        isActive: true
      },
      include: {
        routes: {
          where: {
            isActive: true
          },
          orderBy: {
            pathPrefix: 'asc'
          }
        }
      },
      orderBy: {
        serviceKey: 'asc'
      }
    });

    return services.map((service) => ({
      serviceKey: service.serviceKey,
      displayName: service.displayName,
      targetUrl: service.targetUrl,
      requiresAuth: service.requiresAuth,
      routes: service.routes.map((route) => route.pathPrefix)
    }));
  }

  async getRegisteredRoutes() {
    const routes = await this.prisma.gatewayRoute.findMany({
      where: {
        isActive: true,
        service: {
          isActive: true
        }
      },
      include: {
        service: true
      },
      orderBy: [{ service: { serviceKey: 'asc' } }, { pathPrefix: 'asc' }]
    });

    return routes.map((route) => ({
      pathPrefix: route.pathPrefix,
      description: route.description,
      serviceKey: route.service.serviceKey,
      serviceName: route.service.displayName,
      targetUrl: route.service.targetUrl,
      requiresAuth: route.service.requiresAuth
    }));
  }

  async forwardRequest(
    resource: string,
    path: string | undefined,
    request: Request,
    response: Response
  ) {
    const route = await this.resolveRoute(resource);
    const targetUrl = this.buildTargetUrl(route.service.targetUrl, resource, path);
    const proxyConfig: AxiosRequestConfig = {
      method: request.method as Method,
      url: targetUrl,
      params: request.query,
      data: this.methodSupportsBody(request.method) ? request.body : undefined,
      headers: this.buildForwardHeaders(request, route.service.serviceKey),
      responseType: 'arraybuffer',
      validateStatus: () => true
    };

    try {
      const upstreamResponse = await this.httpService.axiosRef.request(proxyConfig);

      this.copyUpstreamHeaders(upstreamResponse, response);
      await this.registerLog({
        request,
        route,
        targetUrl,
        statusCode: upstreamResponse.status,
        success: upstreamResponse.status < 500
      });

      return response.status(upstreamResponse.status).send(upstreamResponse.data);
    } catch (error) {
      await this.registerLog({
        request,
        route,
        targetUrl,
        statusCode: 502,
        success: false
      });

      return response.status(502).json({
        message: 'No fue posible comunicarse con el microservicio de destino.',
        serviceKey: route.service.serviceKey,
        targetUrl
      });
    }
  }

  private async resolveRoute(resource: string) {
    const route = await this.prisma.gatewayRoute.findFirst({
      where: {
        pathPrefix: resource,
        isActive: true,
        service: {
          isActive: true
        }
      },
      include: {
        service: true
      }
    });

    if (!route) {
      throw new NotFoundException(
        `No existe una ruta registrada en el API Gateway para el recurso ${resource}.`
      );
    }

    return route;
  }

  private buildTargetUrl(baseUrl: string, resource: string, path?: string) {
    const sanitizedBase = baseUrl.replace(/\/+$/, '');
    const pathSuffix = path ? `/${path}` : '';

    return `${sanitizedBase}/${resource}${pathSuffix}`;
  }

  private methodSupportsBody(method: string) {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  }

  private normalizePath(path: string) {
    if (!path.startsWith('/')) {
      return `/${path}`;
    }

    return path;
  }

  private extractGatewayPath(request: Request) {
    const rawPath = request.originalUrl.split('?')[0];
    const withoutGatewayPrefix = rawPath.replace(/^\/api\/v1(?=\/|$)/, '');

    return this.normalizePath(withoutGatewayPrefix);
  }

  private isInternalPath(path: string) {
    return this.internalPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  }

  private buildForwardHeaders(request: Request, serviceKey: string) {
    const headers: Record<string, string> = {};

    for (const [key, value] of Object.entries(request.headers)) {
      if (!value) {
        continue;
      }

      const normalizedKey = key.toLowerCase();

      if (['host', 'content-length', 'connection'].includes(normalizedKey)) {
        continue;
      }

      headers[key] = Array.isArray(value) ? value.join(', ') : value;
    }

    headers['x-forwarded-for'] = this.getClientIp(request) ?? '';
    headers['x-forwarded-host'] = request.headers.host ?? request.hostname ?? '';
    headers['x-gateway-service'] = serviceKey;

    return headers;
  }

  private copyUpstreamHeaders(upstreamResponse: AxiosResponse, response: Response) {
    for (const [key, value] of Object.entries(upstreamResponse.headers)) {
      if (!value) {
        continue;
      }

      const normalizedKey = key.toLowerCase();

      if (['transfer-encoding', 'content-length', 'connection'].includes(normalizedKey)) {
        continue;
      }

      response.setHeader(key, Array.isArray(value) ? value.join(', ') : String(value));
    }
  }

  private async registerLog(input: {
    request: Request;
    route: RouteWithService;
    targetUrl: string;
    statusCode: number;
    success: boolean;
  }) {
    try {
      await this.prisma.gatewayRequestLog.create({
        data: {
          method: input.request.method,
          path: input.request.path,
          query: this.stringifyQuery(input.request.query),
          targetUrl: input.targetUrl,
          statusCode: input.statusCode,
          success: input.success,
          clientIp: this.getClientIp(input.request),
          userAgent: this.getUserAgent(input.request),
          serviceId: input.route.service.id
        }
      });
    } catch {
      return;
    }
  }

  private stringifyQuery(query: Request['query']) {
    const keys = Object.keys(query);

    if (keys.length === 0) {
      return null;
    }

    return JSON.stringify(query);
  }

  private getClientIp(request: Request) {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
      return forwardedFor.split(',')[0].trim();
    }

    return request.ip;
  }

  private getUserAgent(request: Request) {
    const userAgent = request.headers['user-agent'];

    if (Array.isArray(userAgent)) {
      return userAgent.join(', ');
    }

    return userAgent ?? null;
  }
}
