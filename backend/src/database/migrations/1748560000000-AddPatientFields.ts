import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enriquece a la persona a cuidar con datos clave y evita altas duplicadas:
 *
 *  - patients.dni (varchar, único): documento de identidad. El índice único
 *    tolera varios NULL (registros heredados sin DNI), pero el alta exige DNI
 *    desde la capa de aplicación: dos personas no pueden compartir documento.
 *  - patients.fecha_nacimiento (date)
 *  - patients.contacto_emergencia_nombre / contacto_emergencia_telefono (varchar)
 *  - patients.observaciones (text): notas de cuidado.
 */
export class AddPatientFields1748560000000 implements MigrationInterface {
  name = 'AddPatientFields1748560000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN "dni" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN "fecha_nacimiento" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN "contacto_emergencia_nombre" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN "contacto_emergencia_telefono" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN "observaciones" text`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_patients_dni" ON "patients" ("dni")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_patients_dni"`);
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "observaciones"`);
    await queryRunner.query(
      `ALTER TABLE "patients" DROP COLUMN "contacto_emergencia_telefono"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP COLUMN "contacto_emergencia_nombre"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP COLUMN "fecha_nacimiento"`,
    );
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "dni"`);
  }
}
