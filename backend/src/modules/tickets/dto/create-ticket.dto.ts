import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';

export class CreateTicketDto {
  @IsUUID()
  lotId: string;

  @IsOptional()
  @IsUUID()
  spotId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsString()
  plateNumber: string;

  @IsOptional()
  @IsDateString()
  entryTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
