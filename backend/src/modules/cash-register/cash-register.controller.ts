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
import { CashRegisterService } from './cash-register.service';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { AddMovementDto } from './dto/add-movement.dto';
import { CashRegisterFilterDto } from './dto/cash-register-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ROLES } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@Controller('cash-registers')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Get()
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR)
  @Permissions(PERMISSIONS.CASH_REGISTERS_LIST)
  async findAll(@Query() filter: CashRegisterFilterDto) {
    return this.cashRegisterService.findAll(filter);
  }

  @Post('open')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER)
  @Permissions(PERMISSIONS.CASH_REGISTERS_OPEN)
  @HttpCode(HttpStatus.CREATED)
  async open(@Body() dto: OpenCashRegisterDto, @CurrentUser('sub') userId: string) {
    return this.cashRegisterService.open(dto, userId);
  }

  @Get('open')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER, ROLES.OPERATOR)
  @Permissions(PERMISSIONS.CASH_REGISTERS_LIST)
  async findOpen(@Query('lotId') lotId?: string) {
    return this.cashRegisterService.findOpen(lotId);
  }

  @Get(':id')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER)
  @Permissions(PERMISSIONS.CASH_REGISTERS_LIST)
  async findOne(@Param('id', UuidValidationPipe) id: string) {
    return this.cashRegisterService.findOne(id);
  }

  @Get(':id/movements')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER)
  @Permissions(PERMISSIONS.CASH_REGISTERS_MOVEMENTS)
  async getMovements(@Param('id', UuidValidationPipe) id: string) {
    return this.cashRegisterService.getMovements(id);
  }

  @Get(':id/summary')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR)
  @Permissions(PERMISSIONS.CASH_REGISTERS_LIST)
  async getSummary(@Param('id', UuidValidationPipe) id: string) {
    return this.cashRegisterService.getSummary(id);
  }

  @Post(':id/close')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER)
  @Permissions(PERMISSIONS.CASH_REGISTERS_CLOSE)
  async close(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: CloseCashRegisterDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.cashRegisterService.close(id, dto, userId);
  }

  @Post(':id/movements')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER)
  @Permissions(PERMISSIONS.CASH_REGISTERS_MOVEMENTS)
  @HttpCode(HttpStatus.CREATED)
  async addMovement(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: AddMovementDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.cashRegisterService.addMovement(id, dto, userId);
  }
}
