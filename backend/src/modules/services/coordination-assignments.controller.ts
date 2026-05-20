import { Body, Controller, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ServicesService } from './services.service';

/** Asignación de prestadores a servicios desde el panel de coordinación. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/assignments')
export class CoordinationAssignmentsController {
  constructor(private readonly services: ServicesService) {}

  @Post()
  create(@Body() dto: CreateAssignmentDto) {
    return this.services.createAssignment(dto);
  }
}
