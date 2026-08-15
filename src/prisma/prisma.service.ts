import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // caching_sha2_password (default en MySQL 8) requiere esta opción para
    // completar el handshake sin TLS; si no, el driver mariadb cuelga hasta
    // agotar el pool en vez de fallar con un error claro.
    const url = new URL(process.env.DATABASE_URL as string);
    url.searchParams.set('allowPublicKeyRetrieval', 'true');
    super({ adapter: new PrismaMariaDb(url.toString()) });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Conexión a la base de datos establecida');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Conexión a la base de datos cerrada');
  }
}
