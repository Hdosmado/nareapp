import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PatientStatus } from '../../../common/enums';
import { PatientAddress } from './patient-address.entity';

/** Persona a cuidar: destinataria de la prestación de servicio. */
@Entity('patients')
export class Patient extends BaseEntity {
  @Column()
  apellido: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  telefonoContacto: string;

  @Column({ type: 'enum', enum: PatientStatus, default: PatientStatus.ACTIVO })
  estado: PatientStatus;

  @OneToMany(() => PatientAddress, (address) => address.patient)
  addresses: PatientAddress[];
}
