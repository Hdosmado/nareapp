import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';

/** Estado básico del servicio para healthchecks de Docker/Kubernetes/LB. */
interface HealthStatus {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
}

/**
 * Endpoint público de salud. No hace consultas a la base; reporta que el
 * proceso Node está arriba y respondiendo. Suficiente para `docker
 * healthcheck`. Un readiness check más profundo (DB up, migraciones al
 * día) se puede agregar más adelante.
 */
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): HealthStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
