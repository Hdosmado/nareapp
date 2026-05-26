import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Provider } from '../providers/entities/provider.entity';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { PreServiceLocationEvent } from '../tracking/entities/pre-service-location-event.entity';
import { CoordinationActionsController } from './coordination-actions.controller';
import { CoordinationActionsService } from './coordination-actions.service';
import { CoordinationController } from './coordination.controller';
import { CoordinationService } from './coordination.service';
import { CoordinationAction } from './entities/coordination-action.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceAssignment,
      CoordinationAction,
      Provider,
      PreServiceLocationEvent,
    ]),
    NotificationsModule,
  ],
  controllers: [CoordinationController, CoordinationActionsController],
  providers: [CoordinationService, CoordinationActionsService],
  exports: [CoordinationService],
})
export class CoordinationModule {}
