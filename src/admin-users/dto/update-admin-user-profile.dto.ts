import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateAdminUserProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;
}
