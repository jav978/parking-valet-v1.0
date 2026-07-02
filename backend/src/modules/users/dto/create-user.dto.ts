import { IsEmail, IsString, MinLength, IsOptional, IsUUID, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsUUID()
  roleId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
