import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ServiceStatus } from '../../../common/enums';
import { Patient } from '../../patients/entities/patient.entity';
import { PatientAddress } from '../../patients/entities/patient-address.entity';

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
