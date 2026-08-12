import { IsOptional, IsEnum, IsString } from 'class-validator';
import { CashRegisterStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CashRegisterFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  lotId?: string;

  @IsOptional()
  @IsEnum(CashRegisterStatus)
  status?: CashRegisterStatus;
}
