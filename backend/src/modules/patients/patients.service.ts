import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientAddress } from './entities/patient-address.entity';
import { Patient } from './entities/patient.entity';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patients: Repository<Patient>,
    @InjectRepository(PatientAddress)
    private readonly addresses: Repository<PatientAddress>,
  ) {}

  /** Da de alta una persona a cuidar y, opcionalmente, su domicilio. */
  async create(dto: CreatePatientDto): Promise<Patient> {
    const patient = await this.patients.save(
      this.patients.create({
        apellido: dto.apellido,
        nombre: dto.nombre,
        telefonoContacto: dto.telefonoContacto,
      }),
    );
    if (dto.address) {
      await this.addAddress(patient.id, dto.address);
    }
    return this.findOne(patient.id);
  }

  /** Agrega un domicilio a una persona a cuidar. */
  async addAddress(
    patientId: string,
    dto: CreateAddressDto,
  ): Promise<PatientAddress> {
    const patient = await this.patients.findOne({ where: { id: patientId } });
    if (!patient) {
      throw new NotFoundException('Persona a cuidar no encontrada');
    }
    return this.addresses.save(this.addresses.create({ ...dto, patient }));
  }

  findAll(pagination: PaginationDto): Promise<Patient[]> {
    const { page, limit } = pagination;
    return this.patients.find({
      order: { apellido: 'ASC', nombre: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string): Promise<Patient> {
    const patient = await this.patients.findOne({
      where: { id },
      relations: { addresses: true },
    });
    if (!patient) {
      throw new NotFoundException('Persona a cuidar no encontrada');
    }
    return patient;
  }

  /** Actualiza los datos de una persona a cuidar. */
  async update(id: string, dto: UpdatePatientDto): Promise<Patient> {
    const patient = await this.patients.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException('Persona a cuidar no encontrada');
    }
    // El domicilio anidado se gestiona por su propio CRUD; se ignora acá.
    this.patients.merge(patient, {
      apellido: dto.apellido,
      nombre: dto.nombre,
      telefonoContacto: dto.telefonoContacto,
    });
    await this.patients.save(patient);
    return this.findOne(id);
  }

  /** Elimina físicamente una persona a cuidar. */
  async remove(id: string): Promise<void> {
    const patient = await this.patients.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException('Persona a cuidar no encontrada');
    }
    try {
      await this.patients.delete(id);
    } catch (error) {
      // 23503 = foreign_key_violation: la persona tiene servicios asociados.
      if (error instanceof QueryFailedError && (error as any).code === '23503') {
        throw new ConflictException(
          'No se puede eliminar la persona a cuidar: tiene servicios asociados',
        );
      }
      throw error;
    }
  }
}
