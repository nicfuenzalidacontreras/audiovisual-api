import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
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

const body = (response: request.Response): UserResponseBody =>
  response.body as UserResponseBody;

const bodyList = (response: request.Response): UserResponseBody[] =>
  response.body as UserResponseBody[];

describe('UsersController (e2e)', () => {
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
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  const createUserPayload = (overrides: Record<string, unknown> = {}) => ({
    email: 'jane.doe@example.org',
    password: 'S3cr3tPassword!',
    name: 'Jane Doe',
    ...overrides,
  });

  const createUser = (overrides: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/users')
      .send(createUserPayload(overrides))
      .expect(201);

  describe('GET /users', () => {
    it('returns an empty array when there are no users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('lists users, excluding the ones that were soft-deleted', async () => {
      const kept = await createUser();
      const deleted = await createUser({ email: 'deleted@example.org' });

      await request(app.getHttpServer())
        .delete(`/api/users/${body(deleted).id}`)
        .expect(204);

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .expect(200);
      const users = bodyList(response);

      expect(users).toHaveLength(1);
      expect(users[0].id).toBe(body(kept).id);
      expect(users[0]).not.toHaveProperty('password');
    });
  });

  describe('GET /users/:id', () => {
    it('returns the user when it exists', async () => {
      const created = await createUser();

      const response = await request(app.getHttpServer())
        .get(`/api/users/${body(created).id}`)
        .expect(200);

      expect(body(response).email).toBe('jane.doe@example.org');
      expect(response.body).not.toHaveProperty('password');
    });

    it('returns 404 when the user does not exist', () => {
      return request(app.getHttpServer())
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('returns 404 when the user was soft-deleted', async () => {
      const created = await createUser();

      await request(app.getHttpServer())
        .delete(`/api/users/${body(created).id}`)
        .expect(204);

      return request(app.getHttpServer())
        .get(`/api/users/${body(created).id}`)
        .expect(404);
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
        email: 'admin@example.org',
        role: 'ADMIN',
      });

      expect(body(response).role).toBe('ADMIN');
    });

    it('returns 400 for invalid data', () => {
      return request(app.getHttpServer())
        .post('/api/users')
        .send(createUserPayload({ email: 'not-an-email', password: '123' }))
        .expect(400);
    });

    it('returns 409 for a duplicate email', async () => {
      await createUser();

      return request(app.getHttpServer())
        .post('/api/users')
        .send(createUserPayload())
        .expect(409);
    });
  });

  describe('PATCH /users/:id', () => {
    it('updates the allowed fields, including is_active', async () => {
      const created = await createUser();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${body(created).id}`)
        .send({ name: 'Jane Updated', is_active: false })
        .expect(200);

      expect(body(response).name).toBe('Jane Updated');
      expect(body(response).is_active).toBe(false);
    });

    it('returns 404 when the user does not exist', () => {
      return request(app.getHttpServer())
        .patch('/api/users/00000000-0000-0000-0000-000000000000')
        .send({ name: 'x' })
        .expect(404);
    });

    it('returns 400 for invalid data', async () => {
      const created = await createUser();

      return request(app.getHttpServer())
        .patch(`/api/users/${body(created).id}`)
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('returns 409 for a duplicate email', async () => {
      await createUser();
      const other = await createUser({ email: 'other@example.org' });

      return request(app.getHttpServer())
        .patch(`/api/users/${body(other).id}`)
        .send({ email: 'jane.doe@example.org' })
        .expect(409);
    });
  });

  describe('DELETE /users/:id', () => {
    it('soft deletes the user and it stops appearing afterwards', async () => {
      const created = await createUser();

      await request(app.getHttpServer())
        .delete(`/api/users/${body(created).id}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/users/${body(created).id}`)
        .expect(404);
    });

    it('returns 404 when the user does not exist', () => {
      return request(app.getHttpServer())
        .delete('/api/users/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('returns 404 when the user was already deleted', async () => {
      const created = await createUser();

      await request(app.getHttpServer())
        .delete(`/api/users/${body(created).id}`)
        .expect(204);

      return request(app.getHttpServer())
        .delete(`/api/users/${body(created).id}`)
        .expect(404);
    });
  });
});
