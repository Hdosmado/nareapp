import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigAdminController } from './app-config-admin.controller';
import { AppConfigAdminService } from './app-config-admin.service';
import { AppConfigController } from './app-config.controller';
import { AppConfigService } from './app-config.service';
import { AppConfig } from './entities/app-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AppConfig])],
  controllers: [AppConfigController, AppConfigAdminController],
  providers: [AppConfigService, AppConfigAdminService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
