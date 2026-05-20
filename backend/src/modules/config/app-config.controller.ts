import { Controller, Get } from '@nestjs/common';
import { AppConfigService } from './app-config.service';

@Controller()
export class AppConfigController {
  constructor(private readonly config: AppConfigService) {}

  /** Configuración operativa que consume la app mobile (GET /mobile/config). */
  @Get('mobile/config')
  getMobileConfig(): Record<string, number> {
    return this.config.getMobileConfig();
  }
}
