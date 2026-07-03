import { PaymentMethod } from '../enums/payment-method.enum';
export declare class CreatePaymentSettingDto {
    method: PaymentMethod;
    displayName: string;
    accountName?: string;
    accountValue?: string;
    qrImageUrl: string;
    isActive?: boolean;
}
