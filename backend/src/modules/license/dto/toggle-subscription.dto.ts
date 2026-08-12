import { IsBoolean, IsString, IsNotEmpty } from 'class-validator';

export class ToggleSubscriptionDto {
  @IsBoolean()
  isActive: boolean;

  @IsString()
  @IsNotEmpty()
  password: string;
}
