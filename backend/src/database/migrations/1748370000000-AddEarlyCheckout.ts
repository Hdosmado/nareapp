import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega soporte para "checkout temprano":
 *  - service_assignments.early_checkout (bool, default false): se prende
 *    cuando el prestador finaliza de forma temprana y deja un motivo (el mobile
 *    decide "temprano" con un umbral adaptativo; ver early_checkout.threshold_pct).
 *  - attendance_events.early_checkout_reason (text, nullable): motivo
 *    opcional informado por el prestador en ese momento.
 */
export class AddEarlyCheckout1748370000000 implements MigrationInterface {
  name = 'AddEarlyCheckout1748370000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_assignments" ADD COLUMN "early_checkout" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance_events" ADD COLUMN "early_checkout_reason" text`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "attendance_events" DROP COLUMN "early_checkout_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_assignments" DROP COLUMN "early_checkout"`,
    );
  }
}
