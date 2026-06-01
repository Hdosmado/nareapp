import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Habilita el control anti-fraude del tramo "en servicio":
 *
 *  - pre_service_location_events.inside_geofence (bool, nullable): el servidor
 *    marca si el latido cae dentro del radio del domicilio. Alimenta la
 *    detección de "salió del radio durante el servicio".
 *  - pre_service_location_events.location_permission (varchar, nullable): nivel
 *    de permiso de ubicación reportado por la app (siempre / durante_uso /
 *    denegado / desconocido). Permite detectar que el permiso dejó de ser
 *    "Siempre" durante el servicio.
 *
 * Config (`app_config`):
 *  - tracking.lead_min: 45 -> 10 (la ventana previa se acorta; ahora el
 *    tracking es automático y arranca 10 min antes).
 *  - tracking.trail_min = 10 (NUEVO): minutos tras el fin en que sigue activo.
 *  - reminder.lead_min = 10 (NUEVO): alinea el recordatorio con el arranque del
 *    tracking (antes era una constante de 60 en el código).
 *
 * Los INSERT son idempotentes (WHERE NOT EXISTS) para convivir con el sembrado
 * de defaults que hace AppConfigService al arrancar.
 */
export class AddInServiceTracking1748460000000 implements MigrationInterface {
  name = 'AddInServiceTracking1748460000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pre_service_location_events" ADD COLUMN "inside_geofence" boolean`,
    );
    await queryRunner.query(
      `ALTER TABLE "pre_service_location_events" ADD COLUMN "location_permission" character varying`,
    );

    await queryRunner.query(
      `UPDATE "app_config" SET "value" = '10' WHERE "key" = 'tracking.lead_min'`,
    );
    await queryRunner.query(
      `INSERT INTO "app_config" ("key", "value", "type", "description")
       SELECT 'tracking.trail_min', '10', 'number',
              'Minutos después del fin en que la app mantiene el tracking activo'
       WHERE NOT EXISTS (SELECT 1 FROM "app_config" WHERE "key" = 'tracking.trail_min')`,
    );
    await queryRunner.query(
      `INSERT INTO "app_config" ("key", "value", "type", "description")
       SELECT 'reminder.lead_min', '10', 'number',
              'Minutos antes del inicio en que se envía el recordatorio al prestador'
       WHERE NOT EXISTS (SELECT 1 FROM "app_config" WHERE "key" = 'reminder.lead_min')`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "app_config" WHERE "key" IN ('tracking.trail_min', 'reminder.lead_min')`,
    );
    await queryRunner.query(
      `UPDATE "app_config" SET "value" = '45' WHERE "key" = 'tracking.lead_min'`,
    );
    await queryRunner.query(
      `ALTER TABLE "pre_service_location_events" DROP COLUMN "location_permission"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pre_service_location_events" DROP COLUMN "inside_geofence"`,
    );
  }
}
