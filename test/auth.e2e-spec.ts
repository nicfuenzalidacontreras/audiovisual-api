import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface AuthResponseBody {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string };
}

const authBody = (response: request.Response): AuthResponseBody =>
  response.body as AuthResponseBody;

const EMAIL = 'jane.doe@example.org';
const PASSWORD = 'S3cr3tPassword!';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: {
        email: EMAIL,
        password: await argon2.hash(PASSWORD),
        name: 'Jane Doe',
        role: 'PHOTOGRAPHER',
      },
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  const login = (email: string = EMAIL, password: string = PASSWORD) =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });

  describe('POST /auth/login', () => {
    it('returns an access token, a refresh token, and the authenticated user data', async () => {
      const response = await login().expect(200);
      const result = authBody(response);

      expect(result.access_token).toEqual(expect.any(String));
      expect(result.refresh_token).toEqual(expect.any(String));
      expect(result.user.email).toBe(EMAIL);
      expect(result.user).not.toHaveProperty('password');
    });

    it('returns 401 for an incorrect password', () => {
      return login(EMAIL, 'wrong-password').expect(401);
    });

    it('returns 401 for an email that does not exist', () => {
      return login('missing@example.org', PASSWORD).expect(401);
    });

    it('returns 400 for invalid login data', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the refresh token and issues a new pair', async () => {
      const { refresh_token: refreshToken } = authBody(
        await login().expect(200),
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);
      const result = authBody(response);

      expect(result.access_token).toEqual(expect.any(String));
      expect(result.refresh_token).toEqual(expect.any(String));
      expect(result.refresh_token).not.toBe(refreshToken);
    });

    it('returns 401 when the refresh token was already used (rotated)', async () => {
      const { refresh_token: refreshToken } = authBody(
        await login().expect(200),
      );

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(401);
    });

    it('returns 401 for a refresh token that does not exist', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refresh_token: 'not-a-real-token' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the refresh token so it can no longer be used to refresh', async () => {
      const { refresh_token: refreshToken } = authBody(
        await login().expect(200),
      );

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .send({ refresh_token: refreshToken })
        .expect(200);

      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(401);
    });

    it('returns 401 for a refresh token that is already revoked', async () => {
      const { refresh_token: refreshToken } = authBody(
        await login().expect(200),
      );

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .send({ refresh_token: refreshToken })
        .expect(200);

      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .send({ refresh_token: refreshToken })
        .expect(401);
    });
  });
});
