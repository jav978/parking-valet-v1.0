import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ParkingLotsService } from './parking-lots.service';
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { ParkingLotFilterDto } from './dto/parking-lot-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ROLES } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@Controller('parking-lots')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ParkingLotsController {
  constructor(private readonly parkingLotsService: ParkingLotsService) {}

  @Post()
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR)
  @Permissions(PERMISSIONS.PARKING_LOTS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateParkingLotDto) {
    return this.parkingLotsService.create(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.PARKING_LOTS_LIST)
  async findAll(@Query() filter: ParkingLotFilterDto) {
    return this.parkingLotsService.findAll(filter);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.PARKING_LOTS_READ)
  async findOne(@Param('id', UuidValidationPipe) id: string) {
    return this.parkingLotsService.findOne(id);
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR)
  @Permissions(PERMISSIONS.PARKING_LOTS_UPDATE)
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateParkingLotDto,
  ) {
    return this.parkingLotsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.PARKING_LOTS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', UuidValidationPipe) id: string) {
    await this.parkingLotsService.remove(id);
  }
}
