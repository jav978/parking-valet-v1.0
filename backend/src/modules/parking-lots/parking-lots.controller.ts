import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SpotStatus } from '@prisma/client';
import { ParkingLotsService } from './parking-lots.service';
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { ParkingLotFilterDto } from './dto/parking-lot-filter.dto';
import { CreateSpotTypeDto } from './dto/create-spot-type.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';
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

  // ─── Spot Types ───────────────────────────────────────────

  @Get('spot-types')
  @Permissions(PERMISSIONS.PARKING_LOTS_LIST)
  async findAllSpotTypes() {
    return this.parkingLotsService.findAllSpotTypes();
  }

  @Post('spot-types')
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.PARKING_LOTS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async createSpotType(@Body() dto: CreateSpotTypeDto) {
    return this.parkingLotsService.createSpotType(dto);
  }

  // ─── Spot CRUD ────────────────────────────────────────────

  @Patch('spots/:spotId')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR)
  @Permissions(PERMISSIONS.PARKING_SPOTS_UPDATE)
  async updateSpot(
    @Param('spotId', UuidValidationPipe) spotId: string,
    @Body() dto: UpdateParkingSpotDto,
  ) {
    return this.parkingLotsService.updateSpot(spotId, dto);
  }

  @Delete('spots/:spotId')
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.PARKING_SPOTS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSpot(@Param('spotId', UuidValidationPipe) spotId: string) {
    await this.parkingLotsService.removeSpot(spotId);
  }

  // ─── Parking Lots CRUD ────────────────────────────────────

  @Get()
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER, ROLES.OPERATOR)
  @Permissions(PERMISSIONS.PARKING_LOTS_LIST)
  async findAll(@Query() filter: ParkingLotFilterDto) {
    return this.parkingLotsService.findAll(filter);
  }

  @Post()
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.PARKING_LOTS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateParkingLotDto) {
    // ParkingLot currently has no createdById field in schema, pass without it
    return this.parkingLotsService.create(dto, '');
  }

  @Get(':id/stats')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR)
  @Permissions(PERMISSIONS.PARKING_LOTS_READ)
  async getStats(@Param('id', UuidValidationPipe) id: string) {
    return this.parkingLotsService.getStats(id);
  }

  @Get(':id/spots')
  @Permissions(PERMISSIONS.PARKING_SPOTS_LIST)
  async findSpots(
    @Param('id', UuidValidationPipe) id: string,
    @Query('status') status?: SpotStatus,
  ) {
    return this.parkingLotsService.findSpots(id, status);
  }

  @Post(':id/spots')
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR)
  @Permissions(PERMISSIONS.PARKING_SPOTS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async createSpot(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: CreateParkingSpotDto,
  ) {
    return this.parkingLotsService.createSpot({ ...dto, lotId: id });
  }

  @Get(':id')
  @Permissions(PERMISSIONS.PARKING_LOTS_READ)
  async findOne(@Param('id', UuidValidationPipe) id: string) {
    return this.parkingLotsService.findOne(id);
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN)
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
