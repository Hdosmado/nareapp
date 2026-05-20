import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { databaseConfig } from './database/database.config';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppConfigModule } from './modules/config/app-config.module';
import { CoordinationModule } from './modules/coordination/coordination.module';
import { DevicesModule } from './modules/devices/devices.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { RiskEngineModule } from './modules/risk-engine/risk-engine.module';
import { ServicesModule } from './modules/services/services.module';
import { SyncModule } from './modules/sync/sync.module';
import { TrackingModule } from './modules/tracking/tracking.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    TypeOrmModule.forRootAsync(databaseConfig),
    ScheduleModule.forRoot(),
    // Módulo de auditoría: global, debe cargarse temprano.
    AuditModule,
    // Autenticación y configuración operativa.
    AuthModule,
    AppConfigModule,
    // Dominio.
    DevicesModule,
    ProvidersModule,
    PatientsModule,
    ServicesModule,
    AttendanceModule,
    TrackingModule,
    SyncModule,
    AlertsModule,
    CoordinationModule,
    NotificationsModule,
    // Motor de riesgo (job programado).
    RiskEngineModule,
  ],
  providers: [
    // Guards globales: JWT primero (autentica), roles después (autoriza).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
