import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { RatesService } from './rates.service';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { RateFilterDto } from './dto/rate-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ROLES } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

import { ExchangeRatesService } from './exchange-rates.service';

@Controller('rates')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class RatesController {
  constructor(
    private readonly ratesService: RatesService,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  @Get('exchange-rates')
  async getExchangeRates(@Query('refresh') refresh?: string) {
    const forceRefresh = refresh === 'true';
    return this.exchangeRatesService.getLiveExchangeRates(forceRefresh);
  }

  @Post()
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR)
  @Permissions(PERMISSIONS.RATES_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRateDto) {
    return this.ratesService.create(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.RATES_LIST)
  async findAll(@Query() filter: RateFilterDto) {
    return this.ratesService.findAll(filter);
  }

  @Get('spot-types')
  @Permissions(PERMISSIONS.RATES_LIST)
  async getSpotTypes() {
    return this.ratesService.getSpotTypes();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.RATES_READ)
  async findOne(@Param('id', UuidValidationPipe) id: string) {
    return this.ratesService.findOne(id);
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR)
  @Permissions(PERMISSIONS.RATES_UPDATE)
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateRateDto,
  ) {
    return this.ratesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.RATES_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', UuidValidationPipe) id: string) {
    await this.ratesService.remove(id);
  }
}
