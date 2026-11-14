import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleFilterDto } from './dto/vehicle-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ROLES } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERATOR)
  @Permissions(PERMISSIONS.VEHICLES_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateVehicleDto, @CurrentUser('sub') userId: string) {
    return this.vehiclesService.create(dto, userId);
  }

  @Get()
  @Permissions(PERMISSIONS.VEHICLES_LIST)
  async findAll(@Query() filter: VehicleFilterDto) {
    return this.vehiclesService.findAll(filter);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.VEHICLES_READ)
  async findOne(@Param('id', UuidValidationPipe) id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR)
  @Permissions(PERMISSIONS.VEHICLES_UPDATE)
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.vehiclesService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.VEHICLES_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', UuidValidationPipe) id: string) {
    await this.vehiclesService.remove(id);
  }
}
