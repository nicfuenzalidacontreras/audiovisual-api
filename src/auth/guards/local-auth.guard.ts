import {
  BadRequestException,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from '../dto/login.dto';

// Passport ejecuta la estrategia (y, por lo tanto, la autenticación) antes de que
// el ValidationPipe del handler procese el @Body(), así que sin esta
// validación manual un email/contraseña faltante terminaría respondiendo 401
// en vez del 400 que exige la spec.
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ body: unknown }>();
    const dto = plainToInstance(LoginDto, request.body);
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}
