import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderDevice } from '../devices/entities/provider-device.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { NotificationLogsAdminController } from './notification-logs-admin.controller';
import { NotificationLogsAdminService } from './notification-logs-admin.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationLog, ProviderDevice])],
  controllers: [NotificationsController, NotificationLogsAdminController],
  providers: [NotificationsService, NotificationLogsAdminService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
