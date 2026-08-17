import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface ClientResponseBody {
  id: string;
  name: string;
  rut: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

interface AuthResponseBody {
  access_token: string;
}

const body = (response: request.Response): ClientResponseBody =>
  response.body as ClientResponseBody;

const bodyList = (response: request.Response): ClientResponseBody[] =>
  response.body as ClientResponseBody[];

const PASSWORD = 'S3cr3tPassword!';
const ADMIN_EMAIL = 'admin@example.org';
const PHOTOGRAPHER_EMAIL = 'photographer@example.org';
const ASSISTANT_EMAIL = 'assistant@example.org';

// RUT válidos (dígito verificador real, algoritmo módulo 11): 12.345.678-5 / 87.654.321-4
const VALID_RUT = '123456785';
const OTHER_VALID_RUT = '876543214';

describe('ClientsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let photographerToken: string;
  let assistantToken: string;

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
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();

    const password = await argon2.hash(PASSWORD);
    await prisma.user.createMany({
      data: [
        { email: ADMIN_EMAIL, password, name: 'Admin', role: 'ADMIN' },
        {
          email: PHOTOGRAPHER_EMAIL,
          password,
          name: 'Fotografo',
          role: 'PHOTOGRAPHER',
        },
        {
          email: ASSISTANT_EMAIL,
          password,
          name: 'Asistente',
          role: 'ASSISTANT',
        },
      ],
    });

    const login = (email: string) =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: PASSWORD })
        .expect(200)
        .then((res) => (res.body as AuthResponseBody).access_token);

    adminToken = await login(ADMIN_EMAIL);
    photographerToken = await login(PHOTOGRAPHER_EMAIL);
    assistantToken = await login(ASSISTANT_EMAIL);
  });

  afterEach(async () => {
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();
  });

  const authHeader = (token: string) => `Bearer ${token}`;

  const createClientPayload = (overrides: Record<string, unknown> = {}) => ({
    name: 'Jane Doe',
    rut: VALID_RUT,
    email: 'jane.doe@example.org',
    phone: '+56 9 1234 5678',
    notes: 'VIP',
    ...overrides,
  });

  const createClient = (
    token: string = adminToken,
    overrides: Record<string, unknown> = {},
  ) =>
    request(app.getHttpServer())
      .post('/api/clients')
      .set('Authorization', authHeader(token))
      .send(createClientPayload(overrides))
      .expect(201);

  describe('GET /clients', () => {
    it('lists the clients that exist, excluding the ones that were soft-deleted, for ADMIN', async () => {
      const kept = await createClient();
      const deleted = await createClient(adminToken, {
        rut: OTHER_VALID_RUT,
        email: 'deleted@example.org',
      });

      await request(app.getHttpServer())
        .delete(`/api/clients/${body(deleted).id}`)
        .set('Authorization', authHeader(adminToken))
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/clients')
        .set('Authorization', authHeader(adminToken))
        .expect(200);
      const clients = bodyList(response);

      expect(clients.map((c) => c.id)).toContain(body(kept).id);
      expect(clients.map((c) => c.id)).not.toContain(body(deleted).id);
    });

    it('allows PHOTOGRAPHER to list clients', async () => {
      await createClient();

      const response = await request(app.getHttpServer())
        .get('/api/clients')
        .set('Authorization', authHeader(photographerToken))
        .expect(200);

      expect(bodyList(response)).toHaveLength(1);
    });

    it('returns 401 without an access token', () => {
      return request(app.getHttpServer()).get('/api/clients').expect(401);
    });

    it('returns 403 for an authenticated user with the ASSISTANT role', () => {
      return request(app.getHttpServer())
        .get('/api/clients')
        .set('Authorization', authHeader(assistantToken))
        .expect(403);
    });
  });

  describe('GET /clients/:id', () => {
    it('returns the client when it exists', async () => {
      const created = await createClient();

      const response = await request(app.getHttpServer())
        .get(`/api/clients/${body(created).id}`)
        .set('Authorization', authHeader(adminToken))
        .expect(200);

      expect(body(response).name).toBe('Jane Doe');
    });

    it('allows PHOTOGRAPHER to get a client by id', async () => {
      const created = await createClient();

      return request(app.getHttpServer())
        .get(`/api/clients/${body(created).id}`)
        .set('Authorization', authHeader(photographerToken))
        .expect(200);
    });

    it('returns 404 when the client does not exist', () => {
      return request(app.getHttpServer())
        .get('/api/clients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', authHeader(adminToken))
        .expect(404);
    });

    it('returns 404 when the client was soft-deleted', async () => {
      const created = await createClient();

      await request(app.getHttpServer())
        .delete(`/api/clients/${body(created).id}`)
        .set('Authorization', authHeader(adminToken))
        .expect(200);

      return request(app.getHttpServer())
        .get(`/api/clients/${body(created).id}`)
        .set('Authorization', authHeader(adminToken))
        .expect(404);
    });

    it('returns 401 without an access token', () => {
      return request(app.getHttpServer())
        .get('/api/clients/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('returns 403 for an authenticated user with the ASSISTANT role', async () => {
      const created = await createClient();

      return request(app.getHttpServer())
        .get(`/api/clients/${body(created).id}`)
        .set('Authorization', authHeader(assistantToken))
        .expect(403);
    });
  });

  describe('POST /clients', () => {
    it('creates a client with only the required name, as ADMIN', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', authHeader(adminToken))
        .send({ name: 'Minimal Client' })
        .expect(201);

      expect(body(response).name).toBe('Minimal Client');
      expect(body(response).rut).toBeNull();
    });

    it('creates a client with all fields, as PHOTOGRAPHER', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', authHeader(photographerToken))
        .send(createClientPayload())
        .expect(201);

      expect(body(response).rut).toBe(VALID_RUT);
      expect(body(response).email).toBe('jane.doe@example.org');
    });

    it('returns 400 for a missing name', () => {
      return request(app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', authHeader(adminToken))
        .send(createClientPayload({ name: undefined }))
        .expect(400);
    });

    it('returns 400 for a rut with an invalid format', () => {
      return request(app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', authHeader(adminToken))
        .send(createClientPayload({ rut: '123' }))
        .expect(400);
    });

    it('returns 400 for a rut with an incorrect check digit', () => {
      return request(app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', authHeader(adminToken))
        .send(createClientPayload({ rut: '123456780' }))
        .expect(400);
    });

    it('returns 409 for a duplicate rut', async () => {
      await createClient();

      return request(app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', authHeader(adminToken))
        .send(createClientPayload({ email: 'other@example.org' }))
        .expect(409);
    });

    it('returns 401 without an access token', () => {
      return request(app.getHttpServer())
        .post('/api/clients')
        .send(createClientPayload())
        .expect(401);
    });

    it('returns 403 for an authenticated user with the ASSISTANT role', () => {
      return request(app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', authHeader(assistantToken))
        .send(createClientPayload())
        .expect(403);
    });
  });

  describe('PATCH /clients/:id', () => {
    it('updates the allowed fields, as ADMIN', async () => {
      const created = await createClient();

      const response = await request(app.getHttpServer())
        .patch(`/api/clients/${body(created).id}`)
        .set('Authorization', authHeader(adminToken))
        .send({ name: 'Jane Updated' })
        .expect(200);

      expect(body(response).name).toBe('Jane Updated');
    });

    it('allows PHOTOGRAPHER to update a client', async () => {
      const created = await createClient();

      return request(app.getHttpServer())
        .patch(`/api/clients/${body(created).id}`)
        .set('Authorization', authHeader(photographerToken))
        .send({ name: 'Jane Updated' })
        .expect(200);
    });

    it('returns 404 when the client does not exist', () => {
      return request(app.getHttpServer())
        .patch('/api/clients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', authHeader(adminToken))
        .send({ name: 'x' })
        .expect(404);
    });

    it('returns 400 for a rut with an incorrect check digit', async () => {
      const created = await createClient();

      return request(app.getHttpServer())
        .patch(`/api/clients/${body(created).id}`)
        .set('Authorization', authHeader(adminToken))
        .send({ rut: '123456780' })
        .expect(400);
    });

    it('returns 409 for a duplicate rut', async () => {
      await createClient();
      const other = await createClient(adminToken, {
        rut: OTHER_VALID_RUT,
        email: 'other@example.org',
      });

      return request(app.getHttpServer())
        .patch(`/api/clients/${body(other).id}`)
        .set('Authorization', authHeader(adminToken))
        .send({ rut: VALID_RUT })
        .expect(409);
    });

    it('returns 401 without an access token', async () => {
      const created = await createClient();

      return request(app.getHttpServer())
        .patch(`/api/clients/${body(created).id}`)
        .send({ name: 'x' })
        .expect(401);
    });

    it('returns 403 for an authenticated user with the ASSISTANT role', async () => {
      const created = await createClient();

      return request(app.getHttpServer())
        .patch(`/api/clients/${body(created).id}`)
        .set('Authorization', authHeader(assistantToken))
        .send({ name: 'x' })
        .expect(403);
    });
  });

  describe('DELETE /clients/:id', () => {
    it('soft deletes the client and it stops appearing afterwards, as ADMIN', async () => {
      const created = await createClient();

      const response = await request(app.getHttpServer())
        .delete(`/api/clients/${body(created).id}`)
        .set('Authorization', authHeader(adminToken))
        .expect(200);

      expect(response.body).toEqual({ message: 'Cliente eliminado con éxito' });

      await request(app.getHttpServer())
        .get(`/api/clients/${body(created).id}`)
        .set('Authorization', authHeader(adminToken))
        .expect(404);
    });

    it('returns 404 when the client does not exist', () => {
      return request(app.getHttpServer())
        .delete('/api/clients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', authHeader(adminToken))
        .expect(404);
    });

    it('returns 404 when the client was already deleted', async () => {
      const created = await createClient();

      await request(app.getHttpServer())
        .delete(`/api/clients/${body(created).id}`)
        .set('Authorization', authHeader(adminToken))
        .expect(200);

      return request(app.getHttpServer())
        .delete(`/api/clients/${body(created).id}`)
        .set('Authorization', authHeader(adminToken))
        .expect(404);
    });

    it('returns 401 without an access token', async () => {
      const created = await createClient();

      return request(app.getHttpServer())
        .delete(`/api/clients/${body(created).id}`)
        .expect(401);
    });

    it('returns 403 for an authenticated user with the PHOTOGRAPHER role', async () => {
      const created = await createClient();

      return request(app.getHttpServer())
        .delete(`/api/clients/${body(created).id}`)
        .set('Authorization', authHeader(photographerToken))
        .expect(403);
    });

    it('returns 403 for an authenticated user with the ASSISTANT role', async () => {
      const created = await createClient();

      return request(app.getHttpServer())
        .delete(`/api/clients/${body(created).id}`)
        .set('Authorization', authHeader(assistantToken))
        .expect(403);
    });
  });
});
