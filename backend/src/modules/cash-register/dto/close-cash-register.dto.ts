import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CloseCashRegisterDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  closingBalance: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
