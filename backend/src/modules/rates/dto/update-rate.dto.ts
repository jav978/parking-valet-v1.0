import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, Min, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { RateType } from '@prisma/client';

export class UpdateRateDto {
  @IsOptional()
  @IsUUID()
  lotId?: string;

  @IsOptional()
  @IsUUID()
  spotTypeId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(RateType)
  rateType?: RateType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fractionalMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fractionalRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  nightRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyRate?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  effectiveTo?: string;
}
