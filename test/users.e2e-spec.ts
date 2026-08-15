import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface UserResponseBody {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

interface AuthResponseBody {
  access_token: string;
  refresh_token: string;
  user: UserResponseBody;
}

const body = (response: request.Response): UserResponseBody =>
  response.body as UserResponseBody;

const bodyList = (response: request.Response): UserResponseBody[] =>
  response.body as UserResponseBody[];

const ADMIN_EMAIL = 'admin@example.org';
const ADMIN_PASSWORD = 'S3cr3tPassword!';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;

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
        email: ADMIN_EMAIL,
        password: await argon2.hash(ADMIN_PASSWORD),
        name: 'Admin',
        role: 'ADMIN',
      },
    });

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);

    adminToken = (login.body as AuthResponseBody).access_token;
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  const authHeader = (token: string = adminToken) => `Bearer ${token}`;

  const createUserPayload = (overrides: Record<string, unknown> = {}) => ({
    email: 'jane.doe@example.org',
    password: 'S3cr3tPassword!',
    name: 'Jane Doe',
    ...overrides,
  });

  const createUser = (overrides: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', authHeader())
      .send(createUserPayload(overrides))
      .expect(201);

  describe('GET /users', () => {
    it('lists the users that exist, excluding the ones that were soft-deleted', async () => {
      const kept = await createUser();
      const deleted = await createUser({ email: 'deleted@example.org' });

      await request(app.getHttpServer())
        .delete(`/api/users/${body(deleted).id}`)
        .set('Authorization', authHeader())
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', authHeader())
        .expect(200);
      const users = bodyList(response);

      expect(users.map((u) => u.id)).toContain(body(kept).id);
      expect(users.map((u) => u.id)).not.toContain(body(deleted).id);
      expect(users[0]).not.toHaveProperty('password');
    });

    it('returns 401 without an access token', () => {
      return request(app.getHttpServer()).get('/api/users').expect(401);
    });

    it('returns 403 for an authenticated user without the ADMIN role', async () => {
      const photographer = await createUser({
        email: 'photographer@example.org',
        role: 'PHOTOGRAPHER',
      });

      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: body(photographer).email,
          password: 'S3cr3tPassword!',
        })
        .expect(200);
      const photographerToken = (login.body as AuthResponseBody).access_token;

      return request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', authHeader(photographerToken))
        .expect(403);
    });
  });

  describe('GET /users/:id', () => {
    it('returns the user when it exists', async () => {
      const created = await createUser();

      const response = await request(app.getHttpServer())
        .get(`/api/users/${body(created).id}`)
        .set('Authorization', authHeader())
        .expect(200);

      expect(body(response).email).toBe('jane.doe@example.org');
      expect(response.body).not.toHaveProperty('password');
    });

    it('returns 404 when the user does not exist', () => {
      return request(app.getHttpServer())
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', authHeader())
        .expect(404);
    });

    it('returns 404 when the user was soft-deleted', async () => {
      const created = await createUser();

      await request(app.getHttpServer())
        .delete(`/api/users/${body(created).id}`)
        .set('Authorization', authHeader())
        .expect(200);

      return request(app.getHttpServer())
        .get(`/api/users/${body(created).id}`)
        .set('Authorization', authHeader())
        .expect(404);
    });

    it('returns 401 without an access token', () => {
      return request(app.getHttpServer())
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });
  });

  describe('POST /users', () => {
    it('creates a user with the default role', async () => {
      const response = await createUser();

      expect(body(response).role).toBe('PHOTOGRAPHER');
      expect(response.body).not.toHaveProperty('password');
    });

    it('creates a user with an explicit role', async () => {
      const response = await createUser({
        email: 'other-admin@example.org',
        role: 'ADMIN',
      });

      expect(body(response).role).toBe('ADMIN');
    });

    it('returns 400 for invalid data', () => {
      return request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', authHeader())
        .send(createUserPayload({ email: 'not-an-email', password: '123' }))
        .expect(400);
    });

    it('returns 409 for a duplicate email', async () => {
      await createUser();

      return request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', authHeader())
        .send(createUserPayload())
        .expect(409);
    });

    it('returns 401 without an access token', () => {
      return request(app.getHttpServer())
        .post('/api/users')
        .send(createUserPayload())
        .expect(401);
    });
  });

  describe('PATCH /users/:id', () => {
    it('updates the allowed fields, including is_active', async () => {
      const created = await createUser();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${body(created).id}`)
        .set('Authorization', authHeader())
        .send({ name: 'Jane Updated', is_active: false })
        .expect(200);

      expect(body(response).name).toBe('Jane Updated');
      expect(body(response).is_active).toBe(false);
    });

    it('returns 404 when the user does not exist', () => {
      return request(app.getHttpServer())
        .patch('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', authHeader())
        .send({ name: 'x' })
        .expect(404);
    });

    it('returns 400 for invalid data', async () => {
      const created = await createUser();

      return request(app.getHttpServer())
        .patch(`/api/users/${body(created).id}`)
        .set('Authorization', authHeader())
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('returns 409 for a duplicate email', async () => {
      await createUser();
      const other = await createUser({ email: 'other@example.org' });

      return request(app.getHttpServer())
        .patch(`/api/users/${body(other).id}`)
        .set('Authorization', authHeader())
        .send({ email: 'jane.doe@example.org' })
        .expect(409);
    });

    it('returns 401 without an access token', async () => {
      const created = await createUser();

      return request(app.getHttpServer())
        .patch(`/api/users/${body(created).id}`)
        .send({ name: 'x' })
        .expect(401);
    });
  });

  describe('DELETE /users/:id', () => {
    it('soft deletes the user and it stops appearing afterwards', async () => {
      const created = await createUser();

      const response = await request(app.getHttpServer())
        .delete(`/api/users/${body(created).id}`)
        .set('Authorization', authHeader())
        .expect(200);

      expect(response.body).toEqual({ message: 'Usuario eliminado con éxito' });

      await request(app.getHttpServer())
        .get(`/api/users/${body(created).id}`)
        .set('Authorization', authHeader())
        .expect(404);
    });

    it('returns 404 when the user does not exist', () => {
      return request(app.getHttpServer())
        .delete('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', authHeader())
        .expect(404);
    });

    it('returns 404 when the user was already deleted', async () => {
      const created = await createUser();

      await request(app.getHttpServer())
        .delete(`/api/users/${body(created).id}`)
        .set('Authorization', authHeader())
        .expect(200);

      return request(app.getHttpServer())
        .delete(`/api/users/${body(created).id}`)
        .set('Authorization', authHeader())
        .expect(404);
    });

    it('returns 401 without an access token', async () => {
      const created = await createUser();

      return request(app.getHttpServer())
        .delete(`/api/users/${body(created).id}`)
        .expect(401);
    });
  });
});
