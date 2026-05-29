import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Por defecto NestJS serializa un handler que retorna `null` o `undefined`
 * como respuesta vacía (Content-Length: 0), sin Content-Type. Eso obliga a
 * cada cliente a tolerar body vacío como si fuera JSON null. Este interceptor
 * fuerza la respuesta literal `null` con el header JSON correcto, para que
 * los endpoints cuyo contrato es `T | null` devuelvan algo parseable.
 */
@Injectable()
export class NullBodyInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((value) => {
        if (value === null || value === undefined) {
          const res = context.switchToHttp().getResponse<Response>();
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.send('null');
          return;
        }
        return value;
      }),
    );
  }
}
