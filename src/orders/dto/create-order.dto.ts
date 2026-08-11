import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsDecimal,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../payment-settings/enums/payment-method.enum';

class CreateOrderCustomerDto {
  @IsString()
  @MaxLength(150)
  fullName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  // Nên bắt buộc vì lookup order sử dụng phone.
  @IsString()
  @MaxLength(30)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultAddress?: string;
}

class CreateOrderItemDto {
  @IsUUID()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateOrderCustomerDto)
  customer!: CreateOrderCustomerDto;

  @IsString()
  @MaxLength(500)
  shippingAddress!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  /*
   * Nhận tiền dưới dạng decimal string:
   * "0", "10", "10.5", "10.50"
   */
  @IsOptional()
  @IsString()
  @MaxLength(13)
  @IsDecimal(
    {
      decimal_digits: '0,2',
      force_decimal: false,
    },
    {
      message: 'Shipping fee must be a valid USD amount',
    },
  )
  @Matches(/^(0|[1-9]\d*)(\.\d{1,2})?$/, {
    message:
      'Shipping fee must be greater than or equal to zero and contain at most 2 decimal places',
  })
  shippingFee?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
