import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { SpotStatus } from '@prisma/client';

export class ParkingSpotFilterDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  lotId?: string;

  @IsOptional()
  @IsUUID()
  spotTypeId?: string;

  @IsOptional()
  @IsEnum(SpotStatus)
  status?: SpotStatus;
}
