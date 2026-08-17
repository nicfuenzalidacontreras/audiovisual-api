import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { IsRut, normalizeRut } from '../validators/is-rut.validator';

export class CreateClientDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '12345678K' })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? normalizeRut(value) : value,
  )
  @IsRut()
  rut?: string;

  @ApiPropertyOptional({ example: 'jane.doe@example.org' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+56 9 1234 5678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Prefiere contacto por WhatsApp' })
  @IsOptional()
  @IsString()
  notes?: string;
}
