import { IsOptional, IsUUID, IsDateString, IsString, IsNumber, Min } from 'class-validator';

export class CloseTicketDto {
  @IsOptional()
  @IsDateString()
  exitTime?: string;

  @IsOptional()
  @IsUUID()
  rateId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsUUID()
  exitCashRegisterId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
