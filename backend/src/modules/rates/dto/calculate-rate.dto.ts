import { IsString, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CalculateRateDto {
  @IsString()
  rateId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  durationMinutes: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountAmount?: number;
}
