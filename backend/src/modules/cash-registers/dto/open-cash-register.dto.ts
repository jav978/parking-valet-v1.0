import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsUUID } from 'class-validator';

export class OpenCashRegisterDto {
  @IsUUID()
  @IsNotEmpty()
  lotId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  openingBalance: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
