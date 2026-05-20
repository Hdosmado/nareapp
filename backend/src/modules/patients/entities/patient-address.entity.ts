import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Patient } from './patient.entity';

/**
 * Domicilio donde se presta el servicio. Las coordenadas se obtienen por
 * geocodificación; `geom` permite consultas geoespaciales con PostGIS.
 */
@Entity('patient_addresses')
export class PatientAddress extends BaseEntity {
  @ManyToOne(() => Patient, (patient) => patient.addresses, {
    onDelete: 'CASCADE',
  })
  patient: Patient;

  @Column()
  calle: string;

  @Column()
  ciudad: string;

  @Column()
  provincia: string;

  @Column({ type: 'double precision', nullable: true })
  latitude: number;

  @Column({ type: 'double precision', nullable: true })
  longitude: number;

  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  geom: string;

  @Column({ type: 'int', default: 150 })
  allowedRadiusM: number;
}
