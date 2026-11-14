import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFilterDto } from './dto/payment-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(userId, dto);
  }

  @Get()
  async findAll(@Query() filter: PaymentFilterDto) {
    return this.paymentsService.findAll(filter);
  }

  @Get('ticket/:ticketId')
  async findByTicket(@Param('ticketId', UuidValidationPipe) ticketId: string) {
    return this.paymentsService.findByTicket(ticketId);
  }

  @Get(':id')
  async findOne(@Param('id', UuidValidationPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @Delete(':id')
  async remove(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.paymentsService.remove(id, userId);
  }
}
