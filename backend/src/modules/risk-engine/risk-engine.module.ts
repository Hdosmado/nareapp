import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsModule } from '../alerts/alerts.module';
import { AppConfigModule } from '../config/app-config.module';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { PreServiceLocationEvent } from '../tracking/entities/pre-service-location-event.entity';
import { RiskEngineService } from './risk-engine.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceAssignment, PreServiceLocationEvent]),
    AppConfigModule,
    AlertsModule,
  ],
  providers: [RiskEngineService],
  exports: [RiskEngineService],
})
export class RiskEngineModule {}
