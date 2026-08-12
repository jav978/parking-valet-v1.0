import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class PaymentFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  ticketId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
