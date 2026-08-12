import { IsString, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateParkingSpotDto {
  @IsOptional() @IsString() lotId?: string;
  @IsOptional() @IsString() spotNumber?: string;
  @IsOptional() @IsInt() @Type(() => Number) floor?: number;
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsString() spotTypeId?: string;
}
