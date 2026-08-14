import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'jane.doe@example.org' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, example: 'S3cr3tPassword!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.PHOTOGRAPHER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
