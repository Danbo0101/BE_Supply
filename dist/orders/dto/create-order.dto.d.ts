import { PaymentMethod } from '../../payment-settings/enums/payment-method.enum';
declare class CreateOrderCustomerDto {
    fullName: string;
    email?: string;
    phone?: string;
    defaultAddress?: string;
}
declare class CreateOrderItemDto {
    productId: string;
    quantity: number;
}
export declare class CreateOrderDto {
    customer: CreateOrderCustomerDto;
    shippingAddress: string;
    note?: string;
    paymentMethod: PaymentMethod;
    paymentReference: string;
    paymentProofUrl?: string;
    shippingFee?: number;
    items: CreateOrderItemDto[];
}
export {};
