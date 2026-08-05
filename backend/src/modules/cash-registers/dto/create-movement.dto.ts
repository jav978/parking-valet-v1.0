import { IsEnum, IsNotEmpty, IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { MovementType } from '@prisma/client';

export class CreateCashMovementDto {
  @IsEnum(MovementType)
  @IsNotEmpty()
  type: MovementType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  referenceNumber?: string;
}
