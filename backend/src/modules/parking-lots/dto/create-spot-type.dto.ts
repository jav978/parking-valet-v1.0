import { IsString, IsOptional } from 'class-validator';

export class CreateSpotTypeDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
