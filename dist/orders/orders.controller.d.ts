import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderPaymentProofDto } from './dto/update-order-payment-proof.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';
import { UpdateOrderInfoDto } from './dto/update-order-info.dto';
import { UpdateOrderItemsDto } from './dto/update-order-items.dto';
import { OrderStatus } from './enums/order-status.enum';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    findByCalendarDateRange(from: string, to: string): Promise<{
        from: string;
        to: string;
        timezone: string;
        summary: {
            pending: number;
            new: number;
            done: number;
            cancelled: number;
        } & {
            total: number;
        };
        days: ({
            pending: number;
            new: number;
            done: number;
            cancelled: number;
        } & {
            date: string;
            total: number;
            percentages: {
                pending: number;
                new: number;
                done: number;
                cancelled: number;
            };
        })[];
    }>;
    findByCalendarDate(date: string, status?: OrderStatus): Promise<{
        date: string;
        timezone: string;
        status: OrderStatus | null;
        total: number;
        orders: {
            id: string;
            orderCode: string;
            customerName: string;
            customerPhone: string | null;
            totalAmount: string;
            paymentMethod: import("../payment-settings/enums/payment-method.enum").PaymentMethod;
            paymentProofUrl: string | null;
            submittedAt: Date | null;
            status: OrderStatus;
            statusAt: Date;
            itemCount: number;
            totalQuantity: number;
        }[];
    }>;
    create(createOrderDto: CreateOrderDto): Promise<{
        id: string;
        orderCode: string;
        customer: {
            id: string;
            customerCode: string | undefined;
            fullName: string;
            email: string | null;
            phone: string | null;
        };
        shippingAddress: string;
        note: string | null;
        subtotal: string;
        shippingFee: string;
        totalAmount: string;
        paymentMethod: import("../payment-settings/enums/payment-method.enum").PaymentMethod;
        paymentProofUrl: string | undefined;
        status: OrderStatus;
        submittedAt: Date | null;
        doneAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        items: {
            id: string;
            productId: string | undefined;
            productCode: string | undefined;
            productName: string;
            productThumbnailUrl: string | undefined;
            quantity: number;
            unitPrice: string;
            totalPrice: string;
        }[];
    }>;
    createByAdmin(createOrderDto: CreateOrderDto): Promise<{
        id: string;
        orderCode: string;
        customer: {
            id: string;
            customerCode: string | undefined;
            fullName: string;
            email: string | null;
            phone: string | null;
        };
        shippingAddress: string;
        note: string | null;
        subtotal: string;
        shippingFee: string;
        totalAmount: string;
        paymentMethod: import("../payment-settings/enums/payment-method.enum").PaymentMethod;
        paymentProofUrl: string | undefined;
        status: OrderStatus;
        submittedAt: Date | null;
        doneAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        items: {
            id: string;
            productId: string | undefined;
            productCode: string | undefined;
            productName: string;
            productThumbnailUrl: string | undefined;
            quantity: number;
            unitPrice: string;
            totalPrice: string;
        }[];
    }>;
    lookup(orderCode: string, phone: string): Promise<{
        id: string;
        orderCode: string;
        customer: {
            id: string;
            customerCode: string | undefined;
            fullName: string;
            email: string | null;
            phone: string | null;
        };
        shippingAddress: string;
        note: string | null;
        subtotal: string;
        shippingFee: string;
        totalAmount: string;
        paymentMethod: import("../payment-settings/enums/payment-method.enum").PaymentMethod;
        paymentProofUrl: string | undefined;
        status: OrderStatus;
        submittedAt: Date | null;
        doneAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        items: {
            id: string;
            productId: string | undefined;
            productCode: string | undefined;
            productName: string;
            productThumbnailUrl: string | undefined;
            quantity: number;
            unitPrice: string;
            totalPrice: string;
        }[];
    }>;
    findOne(id: string): Promise<{
        id: string;
        orderCode: string;
        customer: {
            id: string;
            customerCode: string | undefined;
            fullName: string;
            email: string | null;
            phone: string | null;
        };
        shippingAddress: string;
        note: string | null;
        subtotal: string;
        shippingFee: string;
        totalAmount: string;
        paymentMethod: import("../payment-settings/enums/payment-method.enum").PaymentMethod;
        paymentProofUrl: string | undefined;
        status: OrderStatus;
        submittedAt: Date | null;
        doneAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        items: {
            id: string;
            productId: string | undefined;
            productCode: string | undefined;
            productName: string;
            productThumbnailUrl: string | undefined;
            quantity: number;
            unitPrice: string;
            totalPrice: string;
        }[];
    }>;
    findAll(): Promise<{
        id: string;
        orderCode: string;
        customer: {
            id: string;
            customerCode: string | undefined;
            fullName: string;
            email: string | null;
            phone: string | null;
        };
        shippingAddress: string;
        note: string | null;
        subtotal: string;
        shippingFee: string;
        totalAmount: string;
        paymentMethod: import("../payment-settings/enums/payment-method.enum").PaymentMethod;
        paymentProofUrl: string | undefined;
        status: OrderStatus;
        submittedAt: Date | null;
        doneAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        items: {
            id: string;
            productId: string | undefined;
            productCode: string | undefined;
            productName: string;
            productThumbnailUrl: string | undefined;
            quantity: number;
            unitPrice: string;
            totalPrice: string;
        }[];
    }[]>;
    updatePaymentProof(id: string, updateOrderPaymentProofDto: UpdateOrderPaymentProofDto): Promise<{
        id: string;
        orderCode: string;
        customer: {
            id: string;
            customerCode: string | undefined;
            fullName: string;
            email: string | null;
            phone: string | null;
        };
        shippingAddress: string;
        note: string | null;
        subtotal: string;
        shippingFee: string;
        totalAmount: string;
        paymentMethod: import("../payment-settings/enums/payment-method.enum").PaymentMethod;
        paymentProofUrl: string | undefined;
        status: OrderStatus;
        submittedAt: Date | null;
        doneAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        items: {
            id: string;
            productId: string | undefined;
            productCode: string | undefined;
            productName: string;
            productThumbnailUrl: string | undefined;
            quantity: number;
            unitPrice: string;
            totalPrice: string;
        }[];
    }>;
    updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto): Promise<{
        id: string;
        orderCode: string;
        customer: {
            id: string;
            customerCode: string | undefined;
            fullName: string;
            email: string | null;
            phone: string | null;
        };
        shippingAddress: string;
        note: string | null;
        subtotal: string;
        shippingFee: string;
        totalAmount: string;
        paymentMethod: import("../payment-settings/enums/payment-method.enum").PaymentMethod;
        paymentProofUrl: string | undefined;
        status: OrderStatus;
        submittedAt: Date | null;
        doneAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        items: {
            id: string;
            productId: string | undefined;
            productCode: string | undefined;
            productName: string;
            productThumbnailUrl: string | undefined;
            quantity: number;
            unitPrice: string;
            totalPrice: string;
        }[];
    }>;
    updateInfo(id: string, dto: UpdateOrderInfoDto): Promise<{
        id: string;
        orderCode: string;
        customer: {
            id: string;
            customerCode: string | undefined;
            fullName: string;
            email: string | null;
            phone: string | null;
        };
        shippingAddress: string;
        note: string | null;
        subtotal: string;
        shippingFee: string;
        totalAmount: string;
        paymentMethod: import("../payment-settings/enums/payment-method.enum").PaymentMethod;
        paymentProofUrl: string | undefined;
        status: OrderStatus;
        submittedAt: Date | null;
        doneAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        items: {
            id: string;
            productId: string | undefined;
            productCode: string | undefined;
            productName: string;
            productThumbnailUrl: string | undefined;
            quantity: number;
            unitPrice: string;
            totalPrice: string;
        }[];
    }>;
    updateItems(id: string, dto: UpdateOrderItemsDto): Promise<{
        id: string;
        orderCode: string;
        customer: {
            id: string;
            customerCode: string | undefined;
            fullName: string;
            email: string | null;
            phone: string | null;
        };
        shippingAddress: string;
        note: string | null;
        subtotal: string;
        shippingFee: string;
        totalAmount: string;
        paymentMethod: import("../payment-settings/enums/payment-method.enum").PaymentMethod;
        paymentProofUrl: string | undefined;
        status: OrderStatus;
        submittedAt: Date | null;
        doneAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        items: {
            id: string;
            productId: string | undefined;
            productCode: string | undefined;
            productName: string;
            productThumbnailUrl: string | undefined;
            quantity: number;
            unitPrice: string;
            totalPrice: string;
        }[];
    }>;
}
