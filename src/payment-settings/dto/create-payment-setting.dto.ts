import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '../enums/payment-method.enum';

export class CreatePaymentSettingDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsString()
  @MaxLength(100)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  accountName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  accountValue?: string;

  @IsString()
  qrImageUrl!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
