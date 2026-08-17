import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClientsService } from './clients.service';
import { ClientResponseDto } from './dto/client-response.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PHOTOGRAPHER)
  @ApiOperation({ summary: 'Listar clientes' })
  @ApiResponse({ status: 200, type: [ClientResponseDto] })
  findAll(): Promise<ClientResponseDto[]> {
    return this.clientsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PHOTOGRAPHER)
  @ApiOperation({ summary: 'Obtener un cliente por id' })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  findOne(@Param('id') id: string): Promise<ClientResponseDto> {
    return this.clientsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PHOTOGRAPHER)
  @ApiOperation({ summary: 'Crear un cliente' })
  @ApiResponse({ status: 201, type: ClientResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'RUT duplicado' })
  create(@Body() dto: CreateClientDto): Promise<ClientResponseDto> {
    return this.clientsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PHOTOGRAPHER)
  @ApiOperation({ summary: 'Editar un cliente' })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiResponse({ status: 409, description: 'RUT duplicado' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar un cliente' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  remove(@Param('id') id: string): Promise<MessageResponseDto> {
    return this.clientsService.remove(id);
  }
}
