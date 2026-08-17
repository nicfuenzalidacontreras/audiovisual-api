import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClientResponseDto } from './dto/client-response.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { toClientResponse } from './mappers/client-response.mapper';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ClientResponseDto[]> {
    const clients = await this.prisma.client.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'asc' },
    });
    return clients.map(toClientResponse);
  }

  async findOne(id: string): Promise<ClientResponseDto> {
    const client = await this.prisma.client.findFirst({
      where: { id, deleted_at: null },
    });
    if (!client) {
      throw new NotFoundException(`Cliente ${id} no encontrado`);
    }
    return toClientResponse(client);
  }

  async create(dto: CreateClientDto): Promise<ClientResponseDto> {
    try {
      const client = await this.prisma.client.create({
        data: {
          name: dto.name,
          rut: dto.rut,
          email: dto.email,
          phone: dto.phone,
          notes: dto.notes,
        },
      });
      return toClientResponse(client);
    } catch (error) {
      throw toDomainError(error);
    }
  }

  async update(id: string, dto: UpdateClientDto): Promise<ClientResponseDto> {
    await this.findOne(id);

    try {
      const client = await this.prisma.client.update({
        where: { id },
        data: {
          name: dto.name,
          rut: dto.rut,
          email: dto.email,
          phone: dto.phone,
          notes: dto.notes,
        },
      });
      return toClientResponse(client);
    } catch (error) {
      throw toDomainError(error);
    }
  }

  async remove(id: string): Promise<MessageResponseDto> {
    await this.findOne(id);
    await this.prisma.client.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return { message: 'Cliente eliminado con éxito' };
  }
}

function toDomainError(error: unknown): Error {
  if (isUniqueRutViolation(error)) {
    return new ConflictException('El RUT ya está en uso');
  }
  return error as Error;
}

// `rut` es el único campo `@unique` del modelo `Client`, así que cualquier
// P2002 al crear/editar un cliente corresponde a ese constraint.
function isUniqueRutViolation(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
