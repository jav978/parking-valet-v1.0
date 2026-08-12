import { IsNumber, IsOptional, IsString, IsEmail, Min } from 'class-validator';

export class GenerateLicenseDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  durationDays?: number = 30;

  @IsEmail()
  @IsOptional()
  clientEmail?: string;
}
