import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrderPaymentProofDto {
  @IsString()
  paymentProofUrl!: string;
}
