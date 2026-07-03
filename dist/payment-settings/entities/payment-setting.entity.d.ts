import { PaymentMethod } from '../enums/payment-method.enum';
export declare class PaymentSetting {
    id: string;
    method: PaymentMethod;
    displayName: string;
    accountName?: string;
    accountValue?: string;
    qrImageUrl: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
