import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { LicenseService } from './license.service';
import { GenerateLicenseDto } from './dto/generate-license.dto';
import { ActivateLicenseDto } from './dto/activate-license.dto';
import { ToggleSubscriptionDto } from './dto/toggle-subscription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('license')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Get('status')
  async getStatus() {
    return this.licenseService.getLicenseStatus();
  }

  @Post('activate')
  @UseGuards(JwtAuthGuard)
  async activateLicense(@Body() dto: ActivateLicenseDto, @Request() req: any) {
    return this.licenseService.activateLicenseKey(dto, req.user?.id);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generateLicense(@Body() dto: GenerateLicenseDto, @Request() req: any) {
    return this.licenseService.generateLicenseKey(dto, req.user?.id);
  }

  @Post('toggle-subscription')
  @UseGuards(JwtAuthGuard)
  async toggleSubscription(@Body() dto: ToggleSubscriptionDto, @Request() req: any) {
    return this.licenseService.toggleSubscription(dto, req.user);
  }

  @Get('keys')
  @UseGuards(JwtAuthGuard)
  async listKeys() {
    return this.licenseService.listLicenseKeys();
  }
}
