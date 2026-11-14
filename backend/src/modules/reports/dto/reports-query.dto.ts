import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';

export enum ReportGroupBy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class ReportsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  parkingLotId?: string;

  @IsOptional()
  @IsEnum(ReportGroupBy)
  groupBy?: ReportGroupBy = ReportGroupBy.DAY;
}
