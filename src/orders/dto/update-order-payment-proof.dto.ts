import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrderPaymentProofDto {
  @IsString()
  paymentProofUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentReference?: string;
}
