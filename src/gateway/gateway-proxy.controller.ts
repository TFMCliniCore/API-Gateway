import { All, Controller, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { GatewayService } from './gateway.service';

@Controller()
export class GatewayProxyController {
  constructor(private readonly gatewayService: GatewayService) {}

  @All(':resource')
  forwardRoot(
    @Param('resource') resource: string,
    @Req() request: Request,
    @Res() response: Response
  ) {
    return this.gatewayService.forwardRequest(resource, undefined, request, response);
  }

  @All(':resource/{*path}')
  forwardNested(
    @Param('resource') resource: string,
    @Param('path') path: string | undefined,
    @Req() request: Request,
    @Res() response: Response
  ) {
    return this.gatewayService.forwardRequest(resource, path, request, response);
  }
}

