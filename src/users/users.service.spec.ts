import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, User, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

jest.mock('argon2');

type PrismaUserMock = {
  findMany: jest.Mock<Promise<User[]>, [Prisma.UserFindManyArgs]>;
  findFirst: jest.Mock<Promise<User | null>, [Prisma.UserFindFirstArgs]>;
  create: jest.Mock<Promise<User>, [Prisma.UserCreateArgs]>;
  update: jest.Mock<Promise<User>, [Prisma.UserUpdateArgs]>;
};

describe('UsersService', () => {
  let service: UsersService;
  let userDelegate: PrismaUserMock;

  const baseUser = {
    id: 'user-1',
    email: 'jane.doe@example.org',
    password: 'hashed-password',
    name: 'Jane Doe',
    role: UserRole.PHOTOGRAPHER,
    is_active: true,
    last_login_at: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    deleted_at: null,
  };

  function uniqueEmailError() {
    return new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.9.1',
        meta: { target: ['email'] },
      },
    );
  }

  beforeEach(async () => {
    userDelegate = {
      findMany: jest.fn<Promise<User[]>, [Prisma.UserFindManyArgs]>(),
      findFirst: jest.fn<Promise<User | null>, [Prisma.UserFindFirstArgs]>(),
      create: jest.fn<Promise<User>, [Prisma.UserCreateArgs]>(),
      update: jest.fn<Promise<User>, [Prisma.UserUpdateArgs]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: { user: userDelegate } },
      ],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
    (argon2.hash as jest.Mock).mockResolvedValue('hashed-password');
  });

  describe('findAll', () => {
    it('lists users without exposing the password', async () => {
      userDelegate.findMany.mockResolvedValue([baseUser]);

      const result = await service.findAll();

      expect(userDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deleted_at: null } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('password');
    });

    it('returns an empty array when there are no users', async () => {
      userDelegate.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns the user without the password when found', async () => {
      userDelegate.findFirst.mockResolvedValue(baseUser);

      const result = await service.findOne('user-1');

      expect(result.id).toBe('user-1');
      expect(result).not.toHaveProperty('password');
    });

    it('throws NotFoundException when the user does not exist', async () => {
      userDelegate.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('treats a soft-deleted user as not found', async () => {
      userDelegate.findFirst.mockResolvedValue(null);

      await expect(service.findOne('deleted-user')).rejects.toThrow(
        NotFoundException,
      );
      expect(userDelegate.findFirst).toHaveBeenCalledWith({
        where: { id: 'deleted-user', deleted_at: null },
      });
    });
  });

  describe('create', () => {
    it('hashes the password and defaults the role when not provided', async () => {
      userDelegate.create.mockResolvedValue(baseUser);

      const result = await service.create({
        email: 'jane.doe@example.org',
        password: 'plain-password',
        name: 'Jane Doe',
      });

      expect(argon2.hash).toHaveBeenCalledWith('plain-password');
      expect(userDelegate.create).toHaveBeenCalledWith({
        data: {
          email: 'jane.doe@example.org',
          password: 'hashed-password',
          name: 'Jane Doe',
          role: undefined,
        },
      });
      expect(result).not.toHaveProperty('password');
    });

    it('creates the user with an explicit role', async () => {
      userDelegate.create.mockResolvedValue({
        ...baseUser,
        role: UserRole.ADMIN,
      });

      const result = await service.create({
        email: 'admin@example.org',
        password: 'plain-password',
        name: 'Admin',
        role: UserRole.ADMIN,
      });

      const [{ data }] = userDelegate.create.mock.calls[0];
      expect(data.role).toBe(UserRole.ADMIN);
      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('throws ConflictException on a duplicate email', async () => {
      userDelegate.create.mockRejectedValue(uniqueEmailError());

      await expect(
        service.create({
          email: 'dup@example.org',
          password: 'plain-password',
          name: 'Dup',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates the allowed fields', async () => {
      userDelegate.findFirst.mockResolvedValue(baseUser);
      userDelegate.update.mockResolvedValue({ ...baseUser, name: 'New Name' });

      const result = await service.update('user-1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });

    it('toggles is_active without requiring a soft delete', async () => {
      userDelegate.findFirst.mockResolvedValue(baseUser);
      userDelegate.update.mockResolvedValue({ ...baseUser, is_active: false });

      const result = await service.update('user-1', { is_active: false });

      expect(result.is_active).toBe(false);
      const [{ data }] = userDelegate.update.mock.calls[0];
      expect(data.is_active).toBe(false);
    });

    it('throws NotFoundException when the user does not exist or is deleted', async () => {
      userDelegate.findFirst.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
      expect(userDelegate.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException on a duplicate email', async () => {
      userDelegate.findFirst.mockResolvedValue(baseUser);
      userDelegate.update.mockRejectedValue(uniqueEmailError());

      await expect(
        service.update('user-1', { email: 'dup@example.org' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('soft deletes the user by setting deleted_at', async () => {
      userDelegate.findFirst.mockResolvedValue(baseUser);
      userDelegate.update.mockResolvedValue({
        ...baseUser,
        deleted_at: new Date(),
      });

      await service.remove('user-1');

      expect(userDelegate.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { deleted_at: expect.any(Date) as Date },
      });
    });

    it('throws NotFoundException when the user does not exist', async () => {
      userDelegate.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(userDelegate.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the user was already deleted', async () => {
      userDelegate.findFirst.mockResolvedValue(null);

      await expect(service.remove('already-deleted')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
