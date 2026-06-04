import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ServiceStatus } from '../../../common/enums';
import { Patient } from '../../patients/entities/patient.entity';
import { PatientAddress } from '../../patients/entities/patient-address.entity';
import { ServiceAssignment } from './service-assignment.entity';

/**
 * Servicio: la prestación de cuidado que debe cubrirse en un domicilio,
 * fecha y franja horaria determinados.
 */
@Entity('services')
export class Service extends BaseEntity {
  @ManyToOne(() => Patient)
  patient: Patient;

  @ManyToOne(() => PatientAddress)
  address: PatientAddress;

  /**
   * Asignaciones del servicio (lado inverso, virtual: no agrega columna).
   * Permite al panel leer la asignación operativa activa junto al servicio.
   */
  @OneToMany(() => ServiceAssignment, (assignment) => assignment.service)
  assignments: ServiceAssignment[];

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  @Column()
  ciudad: string;

  @Column()
  provincia: string;

  @Column({ type: 'enum', enum: ServiceStatus, default: ServiceStatus.PENDIENTE })
  estado: ServiceStatus;
}
