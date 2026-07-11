import { Repository } from 'typeorm';
import { CustomersService } from '../customers/customers.service';
import { PaymentSetting } from '../payment-settings/entities/payment-setting.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
export declare class OrdersService {
    private readonly orderRepository;
    private readonly orderItemRepository;
    private readonly productRepository;
    private readonly paymentSettingRepository;
    private readonly customersService;
    constructor(orderRepository: Repository<Order>, orderItemRepository: Repository<OrderItem>, productRepository: Repository<Product>, paymentSettingRepository: Repository<PaymentSetting>, customersService: CustomersService);
    create(createOrderDto: CreateOrderDto): Promise<{
        id: string;
        orderCode: string;
        customer: {
            id: string;
            customerCode: string | undefined;
            fullName: string;
            email: string | undefined;
            phone: string | undefined;
        };
        shippingAddress: string;
        note: string | undefined;
        subtotal: number;
        shippingFee: number;
        totalAmount: number;
        paymentMethod: import("../payment-settings/enums/payment-method.enum").PaymentMethod;
        paymentReference: string;
        paymentProofUrl: string | undefined;
        status: OrderStatus;
        submittedAt: Date | undefined;
        doneAt: Date | undefined;
        createdAt: Date;
        updatedAt: Date;
        items: {
            id: string;
            productId: string | undefined;
            productCode: string | undefined;
            productName: string;
            productThumbnailUrl: string | undefined;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
        }[];
    }>;
    findOne(id: string): Promise<{
        id: string;
        orderCode: string;
        customer: {
            id: string;
            customerCode: string | undefined;
            fullName: string;
            email: string | undefined;
            phone: string | undefined;
        };
        shippingAddress: string;
        note: string | undefined;
        subtotal: number;
        shippingFee: number;
        totalAmount: number;
        paymentMethod: import("../payment-settings/enums/payment-method.enum").PaymentMethod;
        paymentReference: string;
        paymentProofUrl: string | undefined;
        status: OrderStatus;
        submittedAt: Date | undefined;
        doneAt: Date | undefined;
        createdAt: Date;
        updatedAt: Date;
        items: {
            id: string;
            productId: string | undefined;
            productCode: string | undefined;
            productName: string;
            productThumbnailUrl: string | undefined;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
        }[];
    }>;
    private generateOrderCode;
    private toOrderResponse;
}
