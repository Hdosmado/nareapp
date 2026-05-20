import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Parámetros configurables de la aplicación: tolerancias del motor de riesgo,
 * ventana de tracking, frecuencia de muestreo, radios de geocerca, etc.
 * Almacenados como clave/valor para poder ajustarlos sin desplegar código.
 */
@Entity('app_config')
export class AppConfig extends BaseEntity {
  @Index({ unique: true })
  @Column()
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ default: 'string', comment: 'string | number | boolean' })
  type: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}
