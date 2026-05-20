import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro global de excepciones. Devuelve un cuerpo de error uniforme y aplica
 * logging estructurado:
 * - errores de cliente (4xx) -> logger.warn
 * - errores de sistema (5xx) -> logger.error con el stack como segundo argumento
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const statusCode = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttp
      ? exception.message
      : 'Error interno del servidor';

    const line = `${request.method} ${request.url} -> ${statusCode}: ${message}`;

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(line, (exception as Error)?.stack);
    } else {
      this.logger.warn(line);
    }

    response.status(statusCode).json({
      statusCode,
      code: (exception as { code?: string })?.code,
      message,
    });
  }
}
