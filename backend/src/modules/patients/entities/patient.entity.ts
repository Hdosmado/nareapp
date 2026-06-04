import { Column, Entity, Index, OneToMany } from 'typeorm';
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

  // Documento de identidad. Único: identifica a la persona y evita altas
  // duplicadas. El índice tolera NULL para registros heredados sin DNI.
  @Index({ unique: true })
  @Column({ nullable: true })
  dni: string;

  @Column({ type: 'date', nullable: true })
  fechaNacimiento: string;

  @Column({ nullable: true })
  telefonoContacto: string;

  @Column({ nullable: true })
  contactoEmergenciaNombre: string;

  @Column({ nullable: true })
  contactoEmergenciaTelefono: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'enum', enum: PatientStatus, default: PatientStatus.ACTIVO })
  estado: PatientStatus;

  @OneToMany(() => PatientAddress, (address) => address.patient)
  addresses: PatientAddress[];
}
