import { HttpService } from '@nestjs/axios';
import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { GatewayRoute, GatewayService as GatewayServiceModel } from '@prisma/client';
import type { AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import type { NextFunction, Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

type RouteWithService = GatewayRoute & {
    service: GatewayServiceModel;
};

type Accion = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'ERROR';

@Injectable()
export class GatewayService {
    private readonly internalPrefixes = [
        '/health',
        '/auth',
        '/gateway/services',
        '/gateway/routes',
        '/auditoria'
    ];

    constructor(
        private readonly httpService: HttpService,
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService
    ) { }

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
            const route = await this.resolveRoute(resource);
            const remainingPath = segments.length > 0 ? `/${segments.join('/')}` : '';

            // 🚀 LÓGICA DE VALIDACIÓN (El "Guard" dinámico)
            if (route.service.requiresAuth) {
                const token = this.extractTokenFromHeader(request);
                if (!token) {
                    throw new UnauthorizedException('Token no proporcionado. Acceso denegado.');
                }

                let payload: any;
                try {
                    // Validamos el token contra el JWT_SECRET
                    payload = await this.jwtService.verifyAsync(token, {
                        secret: process.env.JWT_SECRET
                    });
                    
                    // Inyectamos el ID del usuario para auditoría
                    request.headers['x-usuario-id'] = payload.sub.toString();
                } catch (err) {
                    // Si falla aquí, es estrictamente problema del JWT
                    throw new UnauthorizedException('Token inválido o expirado.');
                }

                // 🛡️ Lógica RBAC (Fuera del catch del JWT)
                if (route.requiredRoles) {
                    // Limpiamos espacios y convertimos a array de strings
                    const rolesPermitidos = route.requiredRoles.split(',').map(r => r.trim());
                    
                    // Obtenemos el rol del token y nos aseguramos que sea string
                    const rolUsuario = payload.rolId?.toString() || payload.role?.toString();

                    console.log(`Verificando acceso: Usuario tiene Rol [${rolUsuario}], Ruta requiere [${rolesPermitidos}]`);

                    if (!rolUsuario || !rolesPermitidos.includes(rolUsuario)) {
                        throw new ForbiddenException('Tu rol no tiene los permisos necesarios para acceder a este recurso.');
                    }
                }
            }

            return await this.forwardRequest(request, response, route, remainingPath);
        } catch (error: any) { 
            const statusCode = error.status || 500;
            
            const resourceForError = await this.prisma.gatewayRoute.findFirst({
                where: { pathPrefix: resource },
                include: { service: true }
            }).catch(() => null);

            if (resourceForError) {
                await this.registerLog({
                    request,
                    route: resourceForError as RouteWithService,
                    targetUrl: 'N/A',
                    statusCode,
                    success: false
                });
            }

            return response.status(statusCode).json({
                message: error.message || 'Error interno en el API Gateway',
                statusCode
            });
        }
    }

    // --- Métodos de consulta de configuración ---

    async getRegisteredServices() {
        const services = await this.prisma.gatewayService.findMany({
            where: { isActive: true },
            include: {
                routes: { where: { isActive: true }, orderBy: { pathPrefix: 'asc' } }
            },
            orderBy: { serviceKey: 'asc' }
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
            where: { isActive: true, service: { isActive: true } },
            include: { service: true },
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

    // --- Lógica del Proxy ---
    private readRawBody(request: Request): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            request.on('data', (chunk: Buffer) => chunks.push(chunk));
            request.on('end', () => resolve(Buffer.concat(chunks)));
            request.on('error', reject);
        });
    }

    private async forwardRequest(
        request: Request,
        response: Response,
        route: RouteWithService,
        remainingPath: string
    ) {
        const targetUrl = `${route.service.targetUrl}/${route.pathPrefix}${remainingPath}`;
        const contentType = (request.headers['content-type'] as string) ?? '';
        const isMultipart = contentType.includes('multipart/form-data');

        // Para multipart leemos el stream crudo (los body-parsers lo dejan intacto)
        const requestData = isMultipart ? await this.readRawBody(request) : request.body;

        const config: AxiosRequestConfig = {
            method: request.method as Method,
            url: targetUrl,
            data: requestData,
            headers: this.prepareHeaders(request, targetUrl, isMultipart ? contentType : undefined),
            validateStatus: () => true,
            timeout: 30000,
            // Siempre recibir bytes crudos para poder distinguir JSON de binario
            responseType: 'arraybuffer',
            ...(isMultipart && {
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                transformRequest: [(data: unknown) => data],
            }),
        };

        try {
            const axiosResponse: AxiosResponse = await this.httpService.axiosRef.request(config);

            // Registro detallado en DB y consola con las firmas corregidas
            await this.registerLog({
                request,
                route,
                targetUrl,
                statusCode: axiosResponse.status,
                success: axiosResponse.status < 400
            });

            await this.logToAuditoria({
                request,
                route,
                targetUrl,
                statusCode: axiosResponse.status,
                success: axiosResponse.status < 400
            });

            // ── Reenvío inteligente: JSON vs binario ──────────────────────
            const resContentType = (axiosResponse.headers['content-type'] as string) ?? '';
            const isJsonRes = resContentType.includes('application/json') || resContentType === '';

            if (isJsonRes) {
                // Decodificar buffer → texto → JSON
                const text = Buffer.from(axiosResponse.data as ArrayBuffer).toString('utf8');
                let parsed: unknown;
                try   { parsed = text ? JSON.parse(text) : null; }
                catch { parsed = text; }
                return response.status(axiosResponse.status).json(parsed);
            } else {
                // Respuesta binaria (imagen, PDF, …) — reenviar bytes crudos
                response.setHeader('Content-Type', resContentType);
                const cc = axiosResponse.headers['cache-control'];
                if (cc) response.setHeader('Cache-Control', cc as string);
                return response
                    .status(axiosResponse.status)
                    .end(Buffer.from(axiosResponse.data as ArrayBuffer));
            }
        } catch (error) {
            await this.registerLog({
                request,
                route,
                targetUrl,
                statusCode: 502,
                success: false
            });
            return response.status(500).json({ message: 'Error interno en el Gateway Proxy' });
        }
    }

    private async resolveRoute(resource: string) {
        const route = await this.prisma.gatewayRoute.findFirst({
            where: {
                pathPrefix: resource,
                isActive: true,
                service: { isActive: true }
            },
            include: { service: true }
        });

        if (!route) {
            throw new NotFoundException(
                `No existe una ruta registrada en el API Gateway para el recurso ${resource}.`
            );
        }

        return route as RouteWithService;
    }

    private extractGatewayPath(request: Request) {
        const rawPath = request.originalUrl.split('?')[0];
        const withoutGatewayPrefix = rawPath.replace(/^\/api\/v1(?=\/|$)/, '');
        return withoutGatewayPrefix.startsWith('/') ? withoutGatewayPrefix : `/${withoutGatewayPrefix}`;
    }

    private isInternalPath(path: string) {
        return this.internalPrefixes.some(
            (prefix) => path === prefix || path.startsWith(`${prefix}/`)
        );
    }

    private prepareHeaders(request: Request, targetUrl: string, overrideContentType?: string) {
        // 1. Quitamos los headers originales que Express o el cliente metieron y que Axios debe recalcular de forma nativa
        const { host, 'content-length': contentLength, connection, ...headers } = request.headers;

        try {
            const url = new URL(targetUrl);
            return {
                ...headers,
                host: url.host, // Ajusta el host al del microservicio destino
                // Si viene un overrideContentType (como el de multipart con su boundary), usa ese. Si no, por defecto JSON.
                'Content-Type': overrideContentType ?? 'application/json',
                'x-forwarded-for': this.getClientIp(request) ?? '', // Mantiene la IP real del cliente
            };
        } catch {
            // En caso de que targetUrl falle al parsearse, devuelve los headers limpios mutados garantizando el Content-Type
            return {
                ...headers,
                'Content-Type': overrideContentType ?? 'application/json',
            };
        }
    }

    // --- Auditoría y Helpers ---

    private async registerLog(input: {
        request: Request;
        route: RouteWithService;
        targetUrl: string;
        statusCode: number;
        success: boolean;
    }) {
        try {
            const accion = this.resolveAccion(input.request.method, input.statusCode, input.request.path);
            const recurso = this.extractRecurso(input.request.path);
            const usuarioId = this.extractUsuarioId(input.request);
            
            await this.prisma.gatewayRequestLog.create({
                data: {
                    method: input.request.method,
                    path: input.request.path,
                    query: Object.keys(input.request.query).length > 0 ? JSON.stringify(input.request.query) : null,
                    targetUrl: input.targetUrl,
                    statusCode: input.statusCode,
                    success: input.success,
                    clientIp: this.getClientIp(input.request),
                    userAgent: this.getUserAgent(input.request),
                    serviceId: input.route.service.id,
                    accion,
                    recurso,
                    usuarioId,
                    detalle: `status:${input.statusCode}`,
                }
            });
        } catch (err: any) { 
            console.error('Error guardando log en DB:', err.message);
        }
    }

    private resolveAccion(method: string, statusCode: number, path: string): Accion {
        if (statusCode >= 500) return 'ERROR';
        if (path.includes('/auth/login')) return 'LOGIN';
        if (path.includes('/auth/logout')) return 'LOGOUT';
        switch (method.toUpperCase()) {
            case 'POST': return 'CREATE';
            case 'GET': return 'READ';
            case 'PATCH':
            case 'PUT': return 'UPDATE';
            case 'DELETE': return 'DELETE';
            default: return 'READ';
        }
    }

    private extractRecurso(path: string): string {
        const segments = path.replace(/^\/api\/v1\//, '').split('/');
        return segments[0] ?? 'desconocido';
    }

    private extractUsuarioId(request: Request): number | null {
        const raw = request.headers['x-usuario-id'];
        const val = Array.isArray(raw) ? raw[0] : raw;
        const parsed = parseInt(val ?? '', 10);
        return isNaN(parsed) ? null : parsed;
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
        return Array.isArray(userAgent) ? userAgent.join(', ') : (userAgent ?? null);
    }

    private async logToAuditoria(input: any) {
        console.log(`[Auditoria] ${input.request.method} ${input.request.path} -> ${input.statusCode} (${input.success})`);
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = (request.headers.authorization || '').split(' ');
        return type === 'Bearer' ? token : undefined;
    }
}