import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega el DNI del prestador y descarga la contraseña del alta:
 *
 *  - providers.dni (varchar, nullable, único): documento de identidad. El
 *    índice único de Postgres tolera varios NULL, así que conviven prestadores
 *    sin DNI cargado. Reemplaza a la contraseña en el alta desde el panel; el
 *    prestador activa su credencial por dispositivo (código de 8 dígitos / QR).
 *
 * La columna passwordHash ya era nullable: no cambia el esquema. Sólo se
 * agrega el DNI.
 */
export class AddProviderDni1748550000000 implements MigrationInterface {
  name = 'AddProviderDni1748550000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "providers" ADD COLUMN "dni" character varying`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_providers_dni" ON "providers" ("dni")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_providers_dni"`);
    await queryRunner.query(`ALTER TABLE "providers" DROP COLUMN "dni"`);
  }
}
