import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jane.doe@example.org' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3cr3tPassword!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
