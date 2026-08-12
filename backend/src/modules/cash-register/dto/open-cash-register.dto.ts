import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OpenCashRegisterDto {
  @IsString()
  lotId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingBalance?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
