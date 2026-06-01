import { Controller, Get, Param, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums';
import { AuditLogsService } from './audit-logs.service';

/**
 * Consulta del log de auditoría desde el panel. El log es append-only desde el
 * dominio: la única vía de escritura es `AuditService.record()` (interno). No se
 * expone POST/PATCH/DELETE por API para que la traza no sea alterable, ni
 * siquiera por coordinación. Solo lectura, restringida a ADMIN.
 */
@Roles(UserRole.ADMIN)
@Controller('coordination/audit-logs')
export class AuditLogsController {
  constructor(private readonly logs: AuditLogsService) {}

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.logs.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.logs.findOne(id);
  }
}
