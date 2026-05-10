import { All, Controller, Next, Req, Res } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { GatewayService } from './gateway.service';

@Controller()
export class GatewayProxyController {
  constructor(private readonly gatewayService: GatewayService) {}

  @All('*') // Captura todas las rutas para que el servicio las procese
  async handleAll(
    @Req() request: Request,
    @Res() response: Response,
    @Next() next: NextFunction,
  ) {
    return await this.gatewayService.handleProxyRequest(request, response, next);
  }
}