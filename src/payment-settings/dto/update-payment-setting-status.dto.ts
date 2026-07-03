import { IsBoolean } from 'class-validator';

export class UpdatePaymentSettingStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
