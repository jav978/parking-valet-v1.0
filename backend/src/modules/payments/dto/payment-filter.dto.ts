import { IsOptional, IsString, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class PaymentFilterDto {
  @IsOptional()
  @IsString()
  ticketNumber?: string;

  @IsOptional()
  @IsUUID()
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

  @IsOptional()
  limit?: number;

  @IsOptional()
  offset?: number;
}
