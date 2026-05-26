import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreatePatientAddressDto } from './dto/create-patient-address.dto';
import { UpdatePatientAddressDto } from './dto/update-patient-address.dto';
import { PatientAddress } from './entities/patient-address.entity';
import { Patient } from './entities/patient.entity';

@Injectable()
export class PatientAddressesService {
  constructor(
    @InjectRepository(PatientAddress)
    private readonly addresses: Repository<PatientAddress>,
    @InjectRepository(Patient)
    private readonly patients: Repository<Patient>,
  ) {}

  /** Da de alta un domicilio y lo asocia a una persona a cuidar. */
  async create(dto: CreatePatientAddressDto): Promise<PatientAddress> {
    const patient = await this.patients.findOne({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new NotFoundException('Persona a cuidar no encontrada');
    }
    // `geom` queda en null: la geocodificación es trabajo futuro.
    return this.addresses.save(
      this.addresses.create({
        patient,
        calle: dto.calle,
        ciudad: dto.ciudad,
        provincia: dto.provincia,
        latitude: dto.latitude,
        longitude: dto.longitude,
        allowedRadiusM: dto.allowedRadiusM,
      }),
    );
  }

  findAll(pagination: PaginationDto): Promise<PatientAddress[]> {
    const { page, limit } = pagination;
    return this.addresses.find({
      relations: { patient: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string): Promise<PatientAddress> {
    const address = await this.addresses.findOne({
      where: { id },
      relations: { patient: true },
    });
    if (!address) {
      throw new NotFoundException('Domicilio no encontrado');
    }
    return address;
  }

  /** Actualiza los datos de un domicilio. */
  async update(
    id: string,
    dto: UpdatePatientAddressDto,
  ): Promise<PatientAddress> {
    const address = await this.addresses.findOne({ where: { id } });
    if (!address) {
      throw new NotFoundException('Domicilio no encontrado');
    }
    // Si cambia `patientId`, se reasigna a otra persona a cuidar.
    if (dto.patientId) {
      const patient = await this.patients.findOne({
        where: { id: dto.patientId },
      });
      if (!patient) {
        throw new NotFoundException('Persona a cuidar no encontrada');
      }
      address.patient = patient;
    }
    this.addresses.merge(address, {
      calle: dto.calle,
      ciudad: dto.ciudad,
      provincia: dto.provincia,
      latitude: dto.latitude,
      longitude: dto.longitude,
      allowedRadiusM: dto.allowedRadiusM,
    });
    await this.addresses.save(address);
    return this.findOne(id);
  }

  /** Elimina físicamente un domicilio. */
  async remove(id: string): Promise<void> {
    const address = await this.addresses.findOne({ where: { id } });
    if (!address) {
      throw new NotFoundException('Domicilio no encontrado');
    }
    try {
      await this.addresses.delete(id);
    } catch (error) {
      // 23503 = foreign_key_violation: el domicilio tiene servicios asociados.
      if (error instanceof QueryFailedError && (error as any).code === '23503') {
        throw new ConflictException(
          'No se puede eliminar el domicilio: tiene servicios asociados',
        );
      }
      throw error;
    }
  }
}
