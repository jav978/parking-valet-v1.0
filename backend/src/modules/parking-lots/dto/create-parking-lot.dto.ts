import { IsString, IsOptional, IsBoolean, IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateParkingLotDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  totalSpots?: number;

  @IsOptional()
  @IsString()
  openingTime?: string;

  @IsOptional()
  @IsString()
  closingTime?: string;

  @IsOptional()
  @IsBoolean()
  is24h?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  taxPercentage?: number;

  @IsOptional()
  @IsString()
  currency?: string; // default 'VES'

  @IsOptional()
  @IsString()
  ticketPrefix?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
