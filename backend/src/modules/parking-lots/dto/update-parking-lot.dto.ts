import { IsString, IsOptional, IsInt, Min, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateParkingLotDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalSpots?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  availableSpots?: number;

  @IsOptional()
  @IsString()
  openingTime?: string;

  @IsOptional()
  @IsString()
  closingTime?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is24h?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasEvCharging?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasSecurity?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasCovered?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxPercentage?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  ticketPrefix?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
