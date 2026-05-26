import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Provider } from '../providers/entities/provider.entity';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { CoordinationController } from './coordination.controller';
import { CoordinationService } from './coordination.service';
import { CoordinationAction } from './entities/coordination-action.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceAssignment,
      CoordinationAction,
      Provider,
    ]),
    NotificationsModule,
  ],
  controllers: [CoordinationController],
  providers: [CoordinationService],
  exports: [CoordinationService],
})
export class CoordinationModule {}
