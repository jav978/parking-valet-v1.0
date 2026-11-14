import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { CashRegisterStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CashRegisterFilterDto extends PaginationDto {
  @IsUUID()
  @IsOptional()
  lotId?: string;

  @IsEnum(CashRegisterStatus)
  @IsOptional()
  status?: CashRegisterStatus;

  @IsUUID()
  @IsOptional()
  openedById?: string;
}
