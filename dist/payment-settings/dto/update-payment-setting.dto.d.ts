import { PaymentMethod } from '../enums/payment-method.enum';
export declare class UpdatePaymentSettingDto {
    method?: PaymentMethod;
    displayName?: string;
    accountName?: string;
    accountValue?: string;
    qrImageUrl?: string;
}
