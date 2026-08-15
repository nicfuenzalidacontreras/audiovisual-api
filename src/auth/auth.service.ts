import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'crypto';
import type { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service';
import { toUserResponse } from '../users/mappers/user-response.mapper';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenPayload } from './interfaces/jwt-payload.interface';
import { MessageResponseDto } from '../users/dto/message-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: { email, deleted_at: null },
    });
    if (!user || !user.is_active) {
      return null;
    }

    const passwordMatches = await argon2.verify(user.password, password);
    if (!passwordMatches) {
      return null;
    }

    return user;
  }

  async login(user: User): Promise<AuthResponseDto> {
    const tokens = await this.issueTokens(user);
    return { ...tokens, user: toUserResponse(user) };
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const stored = await this.getValidStoredToken(refreshToken);

    const user = await this.prisma.user.findFirst({
      where: { id: stored.user_id, deleted_at: null },
    });
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Rotación: el token usado no puede reutilizarse.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { is_revoked: true },
    });

    const tokens = await this.issueTokens(user);
    return { ...tokens, user: toUserResponse(user) };
  }

  async logout(refreshToken: string): Promise<MessageResponseDto> {
    const stored = await this.getValidStoredToken(refreshToken);

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { is_revoked: true },
    });

    return { message: 'Sesión cerrada con éxito' };
  }

  private async getValidStoredToken(refreshToken: string) {
    try {
      await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
    });
    if (!stored || stored.is_revoked || stored.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    return stored;
  }

  private async issueTokens(
    user: User,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN as StringValue,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, jti: randomUUID() },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN as StringValue,
      },
    );
    const { exp } = this.jwtService.decode<{ exp: number }>(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: hashToken(refreshToken),
        expires_at: new Date(exp * 1000),
      },
    });

    return { access_token: accessToken, refresh_token: refreshToken };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
