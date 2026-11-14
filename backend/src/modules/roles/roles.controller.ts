import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ROLES } from '../../common/constants/roles.constant';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(ROLES.ADMIN)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Permissions(PERMISSIONS.ROLES_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.ROLES_LIST)
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.ROLES_READ)
  async findOne(@Param('id', UuidValidationPipe) id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.ROLES_UPDATE)
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.ROLES_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', UuidValidationPipe) id: string) {
    await this.rolesService.remove(id);
  }

  @Get(':id/permissions')
  @Permissions(PERMISSIONS.ROLES_PERMISSIONS)
  async getPermissions(@Param('id', UuidValidationPipe) id: string) {
    return this.rolesService.getPermissions(id);
  }

  @Post(':id/permissions')
  @Permissions(PERMISSIONS.ROLES_PERMISSIONS)
  async assignPermissions(
    @Param('id', UuidValidationPipe) id: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return this.rolesService.assignPermissions(id, permissionIds);
  }
}
