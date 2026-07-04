import { All, Controller, Next, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { GatewayService } from './gateway.service';

@ApiExcludeController() // 🚀 Oculta el capturador genérico del proxy para no ensuciar la documentación UI
@Controller()
export class GatewayProxyController {
  constructor(private readonly gatewayService: GatewayService) {}

  @All('*')
  async handleAll(
    @Req() request: Request,
    @Res() response: Response,
    @Next() next: NextFunction,
  ) {
    return await this.gatewayService.handleProxyRequest(request, response, next);
  }
}