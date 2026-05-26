import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { OperationalAlert } from './entities/operational-alert.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OperationalAlert, ServiceAssignment]),
    NotificationsModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
