import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CashRegistersService } from './cash-registers.service';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { CreateCashMovementDto } from './dto/create-movement.dto';
import { CashRegisterFilterDto } from './dto/cash-register-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@Controller('cash-registers')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class CashRegistersController {
  constructor(private readonly cashRegistersService: CashRegistersService) {}

  @Post('open')
  @HttpCode(HttpStatus.CREATED)
  async open(
    @CurrentUser('sub') userId: string,
    @Body() dto: OpenCashRegisterDto,
  ) {
    return this.cashRegistersService.open(userId, dto);
  }

  @Post(':id/close')
  async close(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CloseCashRegisterDto,
  ) {
    return this.cashRegistersService.close(id, userId, dto);
  }

  @Get('active')
  async findActive(
    @CurrentUser('sub') userId: string,
    @Query('lotId') lotId?: string,
  ) {
    return this.cashRegistersService.findActive(userId, lotId);
  }

  @Get()
  async findAll(@Query() filter: CashRegisterFilterDto) {
    return this.cashRegistersService.findAll(filter);
  }

  @Get(':id')
  async findOne(@Param('id', UuidValidationPipe) id: string) {
    return this.cashRegistersService.findOne(id);
  }

  @Post(':id/movements')
  @HttpCode(HttpStatus.CREATED)
  async createMovement(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateCashMovementDto,
  ) {
    return this.cashRegistersService.createMovement(id, userId, dto);
  }
}
