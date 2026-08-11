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
    customerEmail: string | null;
    customerPhone: string | null;
    shippingAddress: string;
    note: string | null;
    subtotal: string;
    shippingFee: string;
    totalAmount: string;
    paymentMethod: PaymentMethod;
    paymentProofUrl?: string;
    status: OrderStatus;
    submittedAt: Date | null;
    doneAt: Date | null;
    items: OrderItem[];
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date | null;
}
