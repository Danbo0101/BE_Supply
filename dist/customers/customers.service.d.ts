import { Repository } from 'typeorm';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import { EntityManager } from 'typeorm';
import { FindCustomersQueryDto } from './dto/find-customers-query.dto';
import { Order } from '../orders/entities/order.entity';
import { FindCustomerOrdersQueryDto } from './dto/find-customer-orders-query.dto';
export declare class CustomersService {
    private readonly customerRepository;
    private readonly orderRepository;
    constructor(customerRepository: Repository<Customer>, orderRepository: Repository<Order>);
    create(createCustomerDto: CreateCustomerDto): Promise<Customer>;
    findOrCreate(createCustomerDto: CreateCustomerDto, manager?: EntityManager): Promise<Customer>;
    findAll(findCustomersQueryDto: FindCustomersQueryDto): Promise<{
        query: string | null;
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        items: Customer[];
    }>;
    findOne(id: string): Promise<Customer>;
    lookup(email?: string, phone?: string): Promise<{
        found: boolean;
        matchedBy: null;
        customer: null;
    } | {
        found: boolean;
        matchedBy: string;
        customer: {
            fullName: string;
            email: string | undefined;
            phone: string | undefined;
            defaultAddress: string | undefined;
        };
    }>;
    findOrders(customerId: string, queryDto: FindCustomerOrdersQueryDto): Promise<{
        customerId: string;
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        items: {
            id: string;
            orderCode: string;
            totalAmount: string;
            paymentMethod: import("../payment-settings/enums/payment-method.enum").PaymentMethod;
            paymentProofUrl: string | null;
            status: import("../orders/enums/order-status.enum").OrderStatus;
            submittedAt: Date | null;
        }[];
    }>;
    update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<Customer>;
    private findExistingCustomer;
    private generateCustomerCode;
    private findExistingCustomerExceptId;
    private normalizeEmail;
    private normalizePhone;
    private isUniqueViolation;
}
