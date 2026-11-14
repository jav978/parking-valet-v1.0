import { IsOptional, IsString, IsUUID, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { VehicleType } from '@prisma/client';

export class VehicleFilterDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
