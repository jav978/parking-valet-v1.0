import { IsOptional, IsUUID, IsDateString, IsString, IsNumber, Min, IsBoolean, IsArray } from 'class-validator';

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
  @IsBoolean()
  isLostTicket?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  penaltyAmount?: number;

  @IsOptional()
  @IsUUID()
  exitCashRegisterId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}
