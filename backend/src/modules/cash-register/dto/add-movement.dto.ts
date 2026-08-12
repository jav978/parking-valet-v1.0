import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MovementType } from '@prisma/client';

export class AddMovementDto {
  @IsEnum(MovementType)
  type: MovementType;

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsString()
  description: string;
}
