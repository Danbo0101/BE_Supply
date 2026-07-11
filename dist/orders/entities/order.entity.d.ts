import { Customer } from '../../customers/entities/customer.entity';
import { PaymentMethod } from '../../payment-settings/enums/payment-method.enum';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderItem } from './order-item.entity';
export declare class Order {
    id: string;
    customerId: string;
    customer: Customer;
    orderCode: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    shippingAddress: string;
    note?: string;
    subtotal: string;
    shippingFee: string;
    totalAmount: string;
    paymentMethod: PaymentMethod;
    paymentReference: string;
    paymentProofUrl?: string;
    status: OrderStatus;
    submittedAt?: Date;
    doneAt?: Date;
    items: OrderItem[];
    createdAt: Date;
    updatedAt: Date;
}
