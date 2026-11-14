import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CancelTicketDto {
  /**
   * Motivo OBLIGATORIO de la cancelación (trazabilidad/auditoría).
   * El frontend envía un motivo de la lista estándar, con detalle opcional.
   */
  @IsString()
  @IsNotEmpty({ message: 'El motivo de cancelación es obligatorio' })
  @MinLength(3, { message: 'El motivo es demasiado corto' })
  @MaxLength(255)
  cancelReason: string;
}
