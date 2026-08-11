import { IsEmail, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateOrderInfoDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(150)
  customerName?: string;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsEmail()
  @MaxLength(150)
  customerEmail?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(30)
  customerPhone?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  shippingAddress?: string;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(2000)
  note?: string | null;
}
