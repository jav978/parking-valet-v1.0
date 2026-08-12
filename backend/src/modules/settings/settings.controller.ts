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
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Permissions(PERMISSIONS.SETTINGS_LIST)
  async getAll() {
    return this.settingsService.getAllSettings();
  }

  @Get(':key')
  @Permissions(PERMISSIONS.SETTINGS_LIST)
  async getByKey(@Param('key') key: string) {
    return this.settingsService.getSettingByKey(key);
  }

  @Patch()
  @Permissions(PERMISSIONS.SETTINGS_UPDATE)
  async updateBulk(@Body() settings: Record<string, any>) {
    return this.settingsService.updateBulkSettings(settings);
  }

  // Impresoras
  @Get('printers/list')
  @Permissions(PERMISSIONS.PRINTERS_LIST)
  async getPrinters(@Query('lotId') lotId?: string) {
    return this.settingsService.getPrinters(lotId);
  }

  @Post('printers')
  @Permissions(PERMISSIONS.PRINTERS_CREATE)
  async createPrinter(@Body() dto: any, @CurrentUser('sub') userId: string) {
    return this.settingsService.createPrinter(dto, userId);
  }

  @Patch('printers/:id')
  @Permissions(PERMISSIONS.PRINTERS_UPDATE)
  async updatePrinter(@Param('id', UuidValidationPipe) id: string, @Body() dto: any) {
    return this.settingsService.updatePrinter(id, dto);
  }

  @Delete('printers/:id')
  @Permissions(PERMISSIONS.PRINTERS_DELETE)
  async deletePrinter(@Param('id', UuidValidationPipe) id: string) {
    return this.settingsService.deletePrinter(id);
  }
}
