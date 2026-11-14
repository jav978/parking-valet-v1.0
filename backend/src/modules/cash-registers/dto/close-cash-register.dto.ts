import { IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class CloseCashRegisterDto {
  @IsNumber()
  @Min(0)
  closingBalance: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
