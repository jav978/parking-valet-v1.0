import { IsOptional, IsUUID, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { RateType } from '@prisma/client';

export class RateFilterDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  lotId?: string;

  @IsOptional()
  @IsUUID()
  spotTypeId?: string;

  @IsOptional()
  @IsEnum(RateType)
  rateType?: RateType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
