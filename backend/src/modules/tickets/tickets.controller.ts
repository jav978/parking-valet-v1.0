import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { CancelTicketDto } from './dto/cancel-ticket.dto';
import { TicketFilterDto } from './dto/ticket-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ROLES } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER, ROLES.OPERATOR)
  @Permissions(PERMISSIONS.TICKETS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTicketDto, @CurrentUser('sub') userId: string) {
    return this.ticketsService.create(dto, userId);
  }

  @Get()
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER, ROLES.OPERATOR)
  @Permissions(PERMISSIONS.TICKETS_LIST)
  async findAll(@Query() filter: TicketFilterDto) {
    return this.ticketsService.findAll(filter);
  }

  @Get('active')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER, ROLES.OPERATOR)
  @Permissions(PERMISSIONS.TICKETS_LIST)
  async getActive(@Query('lotId', UuidValidationPipe) lotId: string) {
    return this.ticketsService.getActiveByLot(lotId);
  }

  @Get(':id')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER, ROLES.OPERATOR)
  @Permissions(PERMISSIONS.TICKETS_READ)
  async findOne(@Param('id', UuidValidationPipe) id: string) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id/close')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER)
  @Permissions(PERMISSIONS.TICKETS_CLOSE)
  async close(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: CloseTicketDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.ticketsService.close(id, dto, userId);
  }

  @Patch(':id/cancel')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR)
  @Permissions(PERMISSIONS.TICKETS_CANCEL)
  async cancel(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: CancelTicketDto,
  ) {
    return this.ticketsService.cancel(id, dto);
  }
}
