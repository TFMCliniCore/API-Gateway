import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';

@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
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
  getEstadisticas(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.auditoriaService.getEstadisticas(desde, hasta);
  }

  @Get('usuario/:usuarioId')
  getLogsPorUsuario(@Param('usuarioId', ParseIntPipe) usuarioId: number) {
    return this.auditoriaService.getLogsPorUsuario(usuarioId);
  }

  @Get('sucursal/:sucursalId')
  getLogsPorSucursal(@Param('sucursalId', ParseIntPipe) sucursalId: number) {
    return this.auditoriaService.getLogsPorSucursal(sucursalId);
  }
}
