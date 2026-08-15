import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { RefreshToken, User, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let userDelegate: {
    findFirst: jest.Mock;
  };
  let refreshTokenDelegate: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
    decode: jest.Mock;
  };

  const activeUser: User = {
    id: 'user-1',
    email: 'jane.doe@example.org',
    password: 'hashed-password',
    name: 'Jane Doe',
    role: UserRole.ADMIN,
    is_active: true,
    last_login_at: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    deleted_at: null,
  };

  const storedRefreshToken: RefreshToken = {
    id: 'refresh-token-1',
    user_id: 'user-1',
    token_hash: 'irrelevant-in-tests',
    is_revoked: false,
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
    created_at: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'access-secret';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_SECRET = 'refresh-secret';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  beforeEach(async () => {
    userDelegate = { findFirst: jest.fn() };
    refreshTokenDelegate = {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: { user: userDelegate, refreshToken: refreshTokenDelegate },
        },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
    (argon2.verify as jest.Mock).mockResolvedValue(true);
  });

  describe('validateUser', () => {
    it('returns the user when the credentials are valid', async () => {
      userDelegate.findFirst.mockResolvedValue(activeUser);

      const result = await service.validateUser(
        'jane.doe@example.org',
        'S3cr3tPassword!',
      );

      expect(userDelegate.findFirst).toHaveBeenCalledWith({
        where: { email: 'jane.doe@example.org', deleted_at: null },
      });
      expect(result).toEqual(activeUser);
    });

    it('returns null when the password does not match', async () => {
      userDelegate.findFirst.mockResolvedValue(activeUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'jane.doe@example.org',
        'wrong-password',
      );

      expect(result).toBeNull();
    });

    it('returns null when the email does not exist', async () => {
      userDelegate.findFirst.mockResolvedValue(null);

      const result = await service.validateUser(
        'missing@example.org',
        'S3cr3tPassword!',
      );

      expect(result).toBeNull();
    });

    it('returns null when the user is inactive', async () => {
      userDelegate.findFirst.mockResolvedValue({
        ...activeUser,
        is_active: false,
      });

      const result = await service.validateUser(
        'jane.doe@example.org',
        'S3cr3tPassword!',
      );

      expect(result).toBeNull();
    });

    it('returns null when the user was soft-deleted', async () => {
      userDelegate.findFirst.mockResolvedValue(null);

      const result = await service.validateUser(
        'deleted@example.org',
        'S3cr3tPassword!',
      );

      expect(result).toBeNull();
      expect(userDelegate.findFirst).toHaveBeenCalledWith({
        where: { email: 'deleted@example.org', deleted_at: null },
      });
    });
  });

  describe('login', () => {
    it('issues an access token, a refresh token, and the authenticated user data', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      jwtService.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      });
      refreshTokenDelegate.create.mockResolvedValue(storedRefreshToken);

      const result = await service.login(activeUser);

      expect(result.access_token).toBe('access-token');
      expect(result.refresh_token).toBe('refresh-token');
      expect(result.user).not.toHaveProperty('password');
      expect(result.user.id).toBe(activeUser.id);
      expect(refreshTokenDelegate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ user_id: activeUser.id }) as unknown,
        }),
      );
    });
  });

  describe('refresh', () => {
    function mockValidStoredToken() {
      jwtService.verifyAsync.mockResolvedValue({ sub: activeUser.id });
      refreshTokenDelegate.findUnique.mockResolvedValue(storedRefreshToken);
    }

    it('rotates the refresh token and issues a new pair on success', async () => {
      mockValidStoredToken();
      userDelegate.findFirst.mockResolvedValue(activeUser);
      refreshTokenDelegate.update.mockResolvedValue({
        ...storedRefreshToken,
        is_revoked: true,
      });
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      jwtService.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      });
      refreshTokenDelegate.create.mockResolvedValue(storedRefreshToken);

      const result = await service.refresh('some-refresh-token');

      expect(result.access_token).toBe('new-access-token');
      expect(result.refresh_token).toBe('new-refresh-token');
      expect(refreshTokenDelegate.update).toHaveBeenCalledWith({
        where: { id: storedRefreshToken.id },
        data: { is_revoked: true },
      });
      expect(refreshTokenDelegate.create).toHaveBeenCalledTimes(1);
    });

    it('throws when the refresh token signature is invalid or expired', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.refresh('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refreshTokenDelegate.findUnique).not.toHaveBeenCalled();
    });

    it('throws when the refresh token does not exist', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: activeUser.id });
      refreshTokenDelegate.findUnique.mockResolvedValue(null);

      await expect(service.refresh('unknown-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userDelegate.findFirst).not.toHaveBeenCalled();
    });

    it('throws when the refresh token was already revoked', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: activeUser.id });
      refreshTokenDelegate.findUnique.mockResolvedValue({
        ...storedRefreshToken,
        is_revoked: true,
      });

      await expect(service.refresh('reused-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userDelegate.findFirst).not.toHaveBeenCalled();
    });

    it('throws when the stored refresh token is expired', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: activeUser.id });
      refreshTokenDelegate.findUnique.mockResolvedValue({
        ...storedRefreshToken,
        expires_at: new Date(Date.now() - 1000),
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userDelegate.findFirst).not.toHaveBeenCalled();
    });

    it('throws when the user is inactive', async () => {
      mockValidStoredToken();
      userDelegate.findFirst.mockResolvedValue({
        ...activeUser,
        is_active: false,
      });

      await expect(service.refresh('some-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refreshTokenDelegate.update).not.toHaveBeenCalled();
    });

    it('throws when the user was soft-deleted', async () => {
      mockValidStoredToken();
      userDelegate.findFirst.mockResolvedValue(null);

      await expect(service.refresh('some-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refreshTokenDelegate.update).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revokes the refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: activeUser.id });
      refreshTokenDelegate.findUnique.mockResolvedValue(storedRefreshToken);
      refreshTokenDelegate.update.mockResolvedValue({
        ...storedRefreshToken,
        is_revoked: true,
      });

      const result = await service.logout('some-refresh-token');

      expect(refreshTokenDelegate.update).toHaveBeenCalledWith({
        where: { id: storedRefreshToken.id },
        data: { is_revoked: true },
      });
      expect(result).toEqual({ message: 'Sesión cerrada con éxito' });
    });

    it('throws when the refresh token is invalid', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));

      await expect(service.logout('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refreshTokenDelegate.update).not.toHaveBeenCalled();
    });

    it('throws when the refresh token was already revoked', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: activeUser.id });
      refreshTokenDelegate.findUnique.mockResolvedValue({
        ...storedRefreshToken,
        is_revoked: true,
      });

      await expect(service.logout('reused-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refreshTokenDelegate.update).not.toHaveBeenCalled();
    });
  });
});
