import { RateType } from '@prisma/client';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRateDto {
  @IsString()
  lotId: string;

  @IsString()
  spotTypeId: string;

  @IsString()
  name: string;

  @IsEnum(RateType)
  rateType: RateType;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  baseAmount: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  fractionalMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  fractionalRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  dailyMax?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  nightRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyRate?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
