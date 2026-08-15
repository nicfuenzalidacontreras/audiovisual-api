import { User } from '@prisma/client';
import { UserResponseDto } from '../dto/user-response.dto';

export function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    is_active: user.is_active,
    last_login_at: user.last_login_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
