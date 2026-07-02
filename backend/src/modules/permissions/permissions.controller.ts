import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMIN)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async findAll(@Query('groupBy') groupBy?: string) {
    if (groupBy === 'module') {
      return this.permissionsService.findByModule();
    }
    return this.permissionsService.findAll();
  }
}
