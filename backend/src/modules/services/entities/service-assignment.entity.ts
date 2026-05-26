import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AssignmentStatus, RiskLevel } from '../../../common/enums';
import { Patient } from '../../patients/entities/patient.entity';
import { PatientAddress } from '../../patients/entities/patient-address.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { Service } from './service.entity';

/**
 * Asignación de un prestador a un servicio. Es la unidad operativa central:
 * sobre ella trabajan el motor de riesgo, los eventos de asistencia y el panel.
 */
@Index(['startTime', 'status'])
@Entity('service_assignments')
export class ServiceAssignment extends BaseEntity {
  @ManyToOne(() => Service)
  service: Service;

  @ManyToOne(() => Provider, { nullable: true })
  provider: Provider;

  @ManyToOne(() => Patient)
  patient: Patient;

  @ManyToOne(() => PatientAddress)
  address: PatientAddress;

  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  @Column()
  city: string;

  @Column()
  province: string;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.PENDIENTE,
  })
  status: AssignmentStatus;

  @Column({ type: 'enum', enum: RiskLevel, default: RiskLevel.VERDE })
  riskLevel: RiskLevel;

  @Column({ default: false })
  replacementRequired: boolean;

  @ManyToOne(() => ServiceAssignment, { nullable: true })
  originalAssignment: ServiceAssignment;

  @Column({ type: 'timestamptz', nullable: true })
  checkInAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  checkOutAt: Date;

  /** Momento en que el prestador recibió el recordatorio previo al servicio. */
  @Column({ type: 'timestamptz', nullable: true })
  reminderSentAt: Date | null;
}
