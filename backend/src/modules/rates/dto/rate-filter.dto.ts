import { RateType } from '@prisma/client';
import { IsOptional, IsBoolean, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class RateFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  lotId?: string;

  @IsOptional()
  @IsString()
  spotTypeId?: string;

  @IsOptional()
  @IsEnum(RateType)
  rateType?: RateType;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
