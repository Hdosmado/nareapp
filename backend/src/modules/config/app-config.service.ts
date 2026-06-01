import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CONFIG_DEFAULTS } from './config.defaults';
import { AppConfig } from './entities/app-config.entity';

/**
 * Acceso a los parámetros operativos configurables. Mantiene una caché en
 * memoria y siembra los valores por defecto al arrancar.
 */
@Injectable()
export class AppConfigService implements OnModuleInit {
  private readonly logger = new Logger(AppConfigService.name);
  private cache = new Map<string, string>();

  constructor(
    @InjectRepository(AppConfig)
    private readonly repo: Repository<AppConfig>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
    await this.refreshCache();
  }

  private async seedDefaults(): Promise<void> {
    for (const def of CONFIG_DEFAULTS) {
      const exists = await this.repo.findOne({ where: { key: def.key } });
      if (!exists) {
        await this.repo.save(this.repo.create(def));
        this.logger.log(`Parámetro sembrado: ${def.key} = ${def.value}`);
      }
    }
  }

  /** Recarga la caché desde la base de datos. */
  async refreshCache(): Promise<void> {
    const all = await this.repo.find();
    this.cache = new Map(all.map((row) => [row.key, row.value]));
  }

  getString(key: string, fallback = ''): string {
    return this.cache.get(key) ?? fallback;
  }

  getNumber(key: string, fallback = 0): number {
    const raw = this.cache.get(key);
    const parsed = raw !== undefined ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  getAll(): Record<string, string> {
    return Object.fromEntries(this.cache);
  }

  /** Subconjunto de parámetros que necesita la app mobile. */
  getMobileConfig(): Record<string, number> {
    return {
      trackingLeadMin: this.getNumber('tracking.lead_min', 10),
      trackingTrailMin: this.getNumber('tracking.trail_min', 10),
      trackingIntervalSec: this.getNumber('tracking.interval_sec', 600),
      trackingMaxWindowMin: this.getNumber('tracking.max_window_min', 90),
      geofenceRadiusM: this.getNumber('geofence.radius_m', 150),
      earlyCheckoutThresholdPct: this.getNumber(
        'early_checkout.threshold_pct',
        0.25,
      ),
    };
  }
}
