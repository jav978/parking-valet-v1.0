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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ROLES } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.USERS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto, @CurrentUser('sub') userId: string) {
    return this.usersService.create(dto, userId);
  }

  @Get()
  @Roles(ROLES.ADMIN, ROLES.SUPERVISOR)
  @Permissions(PERMISSIONS.USERS_LIST)
  async findAll(@Query() filter: UserFilterDto) {
    return this.usersService.findAll(filter);
  }

  @Get(':id')
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.USERS_READ)
  async findOne(@Param('id', UuidValidationPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.USERS_UPDATE)
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.usersService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.USERS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', UuidValidationPipe) id: string) {
    await this.usersService.remove(id);
  }
}
