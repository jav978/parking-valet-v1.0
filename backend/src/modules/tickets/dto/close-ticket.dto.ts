import { IsOptional, IsUUID, IsDateString, IsString, IsNumber, Min, IsBoolean, IsArray, ValidateNested, IsEnum, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

/**
 * Pago registrado al momento de cerrar el ticket ("Cobrar y Salir").
 * Opcional: si no se envía, el ticket queda con saldo pendiente.
 */
export class ClosePaymentDto {
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  referenceNumber?: string;
}

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

  /**
   * DEPRECATED: el monto base ahora lo calcula el servidor vía FareCalculatorService.
   * Si se envía y no coincide con el cálculo (tolerancia ±0.01), la petición es rechazada.
   */

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

  @IsOptional()
  @ValidateNested()
  @Type(() => ClosePaymentDto)
  payment?: ClosePaymentDto;
}
