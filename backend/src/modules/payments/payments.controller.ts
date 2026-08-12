import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFilterDto } from './dto/payment-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ROLES } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER)
  @Permissions(PERMISSIONS.PAYMENTS_LIST)
  async findAll(@Query() filter: PaymentFilterDto) {
    return this.paymentsService.findAll(filter);
  }

  @Post()
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER)
  @Permissions(PERMISSIONS.PAYMENTS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePaymentDto, @CurrentUser('sub') userId: string) {
    return this.paymentsService.create(dto, userId);
  }

  @Get('daily-report')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR)
  @Permissions(PERMISSIONS.PAYMENTS_LIST)
  async getDailyReport(
    @Query('date') date: string,
    @Query('lotId') lotId?: string,
  ) {
    return this.paymentsService.getDailyReport(date, lotId);
  }

  @Get('ticket/:ticketId')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER)
  @Permissions(PERMISSIONS.PAYMENTS_LIST)
  async findByTicket(@Param('ticketId', UuidValidationPipe) ticketId: string) {
    return this.paymentsService.findByTicket(ticketId);
  }

  @Get(':id')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER)
  @Permissions(PERMISSIONS.PAYMENTS_READ)
  async findOne(@Param('id', UuidValidationPipe) id: string) {
    return this.paymentsService.findOne(id);
  }
}
