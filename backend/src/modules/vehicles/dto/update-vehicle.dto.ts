import { IsString, IsOptional, IsEnum, IsInt, IsUUID, Min, Max } from 'class-validator';
import { VehicleType } from '@prisma/client';

export class UpdateVehicleDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsString()
  plateNumber?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(1980)
  @Max(2030)
  year?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
