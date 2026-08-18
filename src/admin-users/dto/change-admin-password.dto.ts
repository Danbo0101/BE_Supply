import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangeAdminPasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
