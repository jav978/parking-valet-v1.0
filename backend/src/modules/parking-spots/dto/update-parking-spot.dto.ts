import { IsString, IsOptional, IsUUID, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { SpotStatus } from '@prisma/client';

export class UpdateParkingSpotDto {
  @IsOptional()
  @IsUUID()
  lotId?: string;

  @IsOptional()
  @IsString()
  spotNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  floor?: number;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsUUID()
  spotTypeId?: string;

  @IsOptional()
  @IsEnum(SpotStatus)
  status?: SpotStatus;
}
