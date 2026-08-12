import { IsString, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateParkingSpotDto {
  @IsString()
  lotId: string;

  @IsString()
  spotNumber: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  floor?: number;

  @IsOptional()
  @IsString()
  section?: string;

  @IsString()
  spotTypeId: string;
}
