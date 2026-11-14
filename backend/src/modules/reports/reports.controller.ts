import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  @Permissions(PERMISSIONS.REPORTS_REVENUE)
  async getRevenueReport(@Query() query: ReportsQueryDto) {
    return this.reportsService.getRevenueReport(query);
  }

  @Get('vehicles')
  @Permissions(PERMISSIONS.REPORTS_VEHICLES)
  async getVehiclesReport(@Query() query: ReportsQueryDto) {
    return this.reportsService.getVehiclesReport(query);
  }

  @Get('clients')
  @Permissions(PERMISSIONS.REPORTS_CLIENTS)
  async getClientsReport(@Query() query: ReportsQueryDto) {
    return this.reportsService.getClientsReport(query);
  }

  @Get('occupancy')
  @Permissions(PERMISSIONS.REPORTS_OCCUPANCY)
  async getOccupancyReport(@Query() query: ReportsQueryDto) {
    return this.reportsService.getOccupancyReport(query);
  }

  @Get('operators')
  @Permissions(PERMISSIONS.REPORTS_REVENUE)
  async getOperatorsReport(@Query() query: ReportsQueryDto) {
    return this.reportsService.getOperatorsReport(query);
  }

  @Get('export')
  @Permissions(PERMISSIONS.REPORTS_EXPORT)
  async exportReport(
    @Query() query: ReportsQueryDto,
    @Query('type') type: string,
    @Res() res: Response,
  ) {
    const csvData = await this.reportsService.exportCsv(query, type || 'revenue');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_${type || 'revenue'}_${Date.now()}.csv`);
    return res.send(csvData);
  }
}
