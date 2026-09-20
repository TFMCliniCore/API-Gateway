import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AuditoriaService } from './auditoria.service';

@ApiTags('Auditoría del Sistema')
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener y filtrar registros de auditoría (Logs)' })
  @ApiQuery({ name: 'usuarioId', required: false, type: String, description: 'Filtrar por ID del usuario' })
  @ApiQuery({ name: 'sucursalId', required: false, type: String, description: 'Filtrar por ID de la sucursal' })
  @ApiQuery({ name: 'accion', required: false, type: String, description: 'Filtrar por acción ejecutada (ej: CREATE, UPDATE)' })
  @ApiQuery({ name: 'recurso', required: false, type: String, description: 'Filtrar por recurso afectado (ej: PACIENTES, CITAS)' })
  @ApiQuery({ name: 'success', required: false, type: String, description: 'Filtrar por éxito del evento ("true" o "false")' })
  @ApiQuery({ name: 'desde', required: false, type: String, description: 'Fecha inicial de búsqueda (YYYY-MM-DD)' })
  @ApiQuery({ name: 'hasta', required: false, type: String, description: 'Fecha final de búsqueda (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, type: String, description: 'Número de página para paginación', example: '1' })
  @ApiQuery({ name: 'limit', required: false, type: String, description: 'Cantidad de registros por página', example: '50' })
  @ApiResponse({ status: 200, description: 'Listado de logs recuperado con éxito.' })
  getLogs(
    @Query('usuarioId')  usuarioId?:  string,
    @Query('sucursalId') sucursalId?: string,
    @Query('accion')     accion?:     string,
    @Query('recurso')    recurso?:    string,
    @Query('success')    success?:    string,
    @Query('desde')      desde?:      string,
    @Query('hasta')      hasta?:      string,
    @Query('page')       page?:       string,
    @Query('limit')      limit?:      string,
  ) {
    return this.auditoriaService.getLogs({
      usuarioId:  usuarioId  ? Number(usuarioId)  : undefined,
      sucursalId: sucursalId ? Number(sucursalId) : undefined,
      accion,
      recurso,
      success:    success !== undefined ? success === 'true' : undefined,
      desde,
      hasta,
      page:  page  ? Number(page)  : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Get('estadisticas')
  @ApiOperation({ summary: 'Obtener métricas y estadísticas globales de uso del sistema' })
  @ApiQuery({ name: 'desde', required: false, type: String, description: 'Fecha de inicio del rango (YYYY-MM-DD)' })
  @ApiQuery({ name: 'hasta', required: false, type: String, description: 'Fecha fin del rango (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Métricas calculadas correctamente.' })
  getEstadisticas(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.auditoriaService.getEstadisticas(desde, hasta);
  }

  @Get('usuario/:usuarioId')
  @ApiOperation({ summary: 'Obtener el historial completo de logs de un usuario específico' })
  @ApiParam({ name: 'usuarioId', type: Number, description: 'ID numérico del usuario' })
  @ApiResponse({ status: 200, description: 'Historial del usuario obtenido con éxito.' })
  @ApiResponse({ status: 400, description: 'El ID de usuario proporcionado es inválido.' })
  getLogsPorUsuario(@Param('usuarioId', ParseIntPipe) usuarioId: number) {
    return this.auditoriaService.getLogsPorUsuario(usuarioId);
  }

  @Get('sucursal/:sucursalId')
  @ApiOperation({ summary: 'Obtener el historial completo de logs de una sucursal específica' })
  @ApiParam({ name: 'sucursalId', type: Number, description: 'ID numérico de la sucursal' })
  @ApiResponse({ status: 200, description: 'Historial de la sucursal obtenido con éxito.' })
  @ApiResponse({ status: 400, description: 'El ID de sucursal proporcionado es inválido.' })
  getLogsPorSucursal(@Param('sucursalId', ParseIntPipe) sucursalId: number) {
    return this.auditoriaService.getLogsPorSucursal(sucursalId);
  }
}