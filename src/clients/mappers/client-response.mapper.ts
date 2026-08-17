import { Client } from '@prisma/client';
import { ClientResponseDto } from '../dto/client-response.dto';

export function toClientResponse(client: Client): ClientResponseDto {
  return {
    id: client.id,
    name: client.name,
    rut: client.rut,
    email: client.email,
    phone: client.phone,
    notes: client.notes,
    created_at: client.created_at,
    updated_at: client.updated_at,
  };
}
