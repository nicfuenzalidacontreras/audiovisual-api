import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Client, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from './clients.service';

type PrismaClientMock = {
  findMany: jest.Mock<Promise<Client[]>, [Prisma.ClientFindManyArgs]>;
  findFirst: jest.Mock<Promise<Client | null>, [Prisma.ClientFindFirstArgs]>;
  create: jest.Mock<Promise<Client>, [Prisma.ClientCreateArgs]>;
  update: jest.Mock<Promise<Client>, [Prisma.ClientUpdateArgs]>;
};

describe('ClientsService', () => {
  let service: ClientsService;
  let clientDelegate: PrismaClientMock;

  const baseClient: Client = {
    id: 'client-1',
    name: 'Jane Doe',
    rut: '176543210',
    email: 'jane.doe@example.org',
    phone: '+56 9 1234 5678',
    notes: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    deleted_at: null,
  };

  function uniqueRutError() {
    return new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.9.1',
        meta: { target: ['rut'] },
      },
    );
  }

  beforeEach(async () => {
    clientDelegate = {
      findMany: jest.fn<Promise<Client[]>, [Prisma.ClientFindManyArgs]>(),
      findFirst: jest.fn<
        Promise<Client | null>,
        [Prisma.ClientFindFirstArgs]
      >(),
      create: jest.fn<Promise<Client>, [Prisma.ClientCreateArgs]>(),
      update: jest.fn<Promise<Client>, [Prisma.ClientUpdateArgs]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: PrismaService, useValue: { client: clientDelegate } },
      ],
    }).compile();

    service = module.get(ClientsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('lists clients that are not soft-deleted', async () => {
      clientDelegate.findMany.mockResolvedValue([baseClient]);

      const result = await service.findAll();

      expect(clientDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deleted_at: null } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('client-1');
    });

    it('returns an empty array when there are no clients', async () => {
      clientDelegate.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns the client when found', async () => {
      clientDelegate.findFirst.mockResolvedValue(baseClient);

      const result = await service.findOne('client-1');

      expect(result.id).toBe('client-1');
    });

    it('throws NotFoundException when the client does not exist', async () => {
      clientDelegate.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('treats a soft-deleted client as not found', async () => {
      clientDelegate.findFirst.mockResolvedValue(null);

      await expect(service.findOne('deleted-client')).rejects.toThrow(
        NotFoundException,
      );
      expect(clientDelegate.findFirst).toHaveBeenCalledWith({
        where: { id: 'deleted-client', deleted_at: null },
      });
    });
  });

  describe('create', () => {
    it('creates a client with only the required name', async () => {
      clientDelegate.create.mockResolvedValue({
        ...baseClient,
        rut: null,
        email: null,
        phone: null,
      });

      const result = await service.create({ name: 'Jane Doe' });

      expect(clientDelegate.create).toHaveBeenCalledWith({
        data: {
          name: 'Jane Doe',
          rut: undefined,
          email: undefined,
          phone: undefined,
          notes: undefined,
        },
      });
      expect(result.name).toBe('Jane Doe');
    });

    it('creates a client with all fields', async () => {
      clientDelegate.create.mockResolvedValue(baseClient);

      const result = await service.create({
        name: 'Jane Doe',
        rut: '176543210',
        email: 'jane.doe@example.org',
        phone: '+56 9 1234 5678',
        notes: 'VIP',
      });

      const [{ data }] = clientDelegate.create.mock.calls[0];
      expect(data.rut).toBe('176543210');
      expect(result.email).toBe('jane.doe@example.org');
    });

    it('throws ConflictException on a duplicate rut', async () => {
      clientDelegate.create.mockRejectedValue(uniqueRutError());

      await expect(
        service.create({ name: 'Dup', rut: '176543210' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates the allowed fields', async () => {
      clientDelegate.findFirst.mockResolvedValue(baseClient);
      clientDelegate.update.mockResolvedValue({
        ...baseClient,
        name: 'New Name',
      });

      const result = await service.update('client-1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });

    it('throws NotFoundException when the client does not exist or is deleted', async () => {
      clientDelegate.findFirst.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
      expect(clientDelegate.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException on a duplicate rut', async () => {
      clientDelegate.findFirst.mockResolvedValue(baseClient);
      clientDelegate.update.mockRejectedValue(uniqueRutError());

      await expect(
        service.update('client-1', { rut: '88888888K' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('soft deletes the client by setting deleted_at', async () => {
      clientDelegate.findFirst.mockResolvedValue(baseClient);
      clientDelegate.update.mockResolvedValue({
        ...baseClient,
        deleted_at: new Date(),
      });

      const result = await service.remove('client-1');

      expect(clientDelegate.update).toHaveBeenCalledWith({
        where: { id: 'client-1' },
        data: { deleted_at: expect.any(Date) as Date },
      });
      expect(result).toEqual({ message: 'Cliente eliminado con éxito' });
    });

    it('throws NotFoundException when the client does not exist', async () => {
      clientDelegate.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(clientDelegate.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the client was already deleted', async () => {
      clientDelegate.findFirst.mockResolvedValue(null);

      await expect(service.remove('already-deleted')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
