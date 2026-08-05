import { IsString, IsOptional, IsUUID, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { SpotStatus } from '@prisma/client';

export class CreateParkingSpotDto {
  @IsUUID()
  lotId: string;

  @IsString()
  spotNumber: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  floor?: number;

  @IsOptional()
  @IsString()
  section?: string;

  @IsUUID()
  spotTypeId: string;

  @IsOptional()
  @IsEnum(SpotStatus)
  status?: SpotStatus;
}
