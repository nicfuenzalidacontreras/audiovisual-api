import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { toUserResponse } from './mappers/user-response.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'asc' },
    });
    return users.map(toUserResponse);
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, deleted_at: null },
    });
    if (!user) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    return toUserResponse(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const password = await argon2.hash(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password,
          name: dto.name,
          role: dto.role,
        },
      });
      return toUserResponse(user);
    } catch (error) {
      throw toDomainError(error);
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    await this.findOne(id);

    const password = dto.password ? await argon2.hash(dto.password) : undefined;

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          email: dto.email,
          name: dto.name,
          role: dto.role,
          is_active: dto.is_active,
          password,
        },
      });
      return toUserResponse(user);
    } catch (error) {
      throw toDomainError(error);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}

function toDomainError(error: unknown): Error {
  if (isUniqueEmailViolation(error)) {
    return new ConflictException('El email ya está en uso');
  }
  return error as Error;
}

// `email` es la única columna `@unique` del modelo `User`, así que cualquier
// P2002 al crear/editar un usuario corresponde a ese constraint.
function isUniqueEmailViolation(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
