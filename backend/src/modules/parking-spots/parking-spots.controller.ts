import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ParkingSpotsService } from './parking-spots.service';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';
import { ParkingSpotFilterDto } from './dto/parking-spot-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ROLES } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@Controller('parking-spots')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ParkingSpotsController {
  constructor(private readonly parkingSpotsService: ParkingSpotsService) {}

  @Post()
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR)
  @Permissions(PERMISSIONS.PARKING_SPOTS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateParkingSpotDto) {
    return this.parkingSpotsService.create(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.PARKING_SPOTS_LIST)
  async findAll(@Query() filter: ParkingSpotFilterDto) {
    return this.parkingSpotsService.findAll(filter);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.PARKING_SPOTS_LIST)
  async findOne(@Param('id', UuidValidationPipe) id: string) {
    return this.parkingSpotsService.findOne(id);
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR)
  @Permissions(PERMISSIONS.PARKING_SPOTS_UPDATE)
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateParkingSpotDto,
  ) {
    return this.parkingSpotsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.PARKING_SPOTS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', UuidValidationPipe) id: string) {
    await this.parkingSpotsService.remove(id);
  }
}
