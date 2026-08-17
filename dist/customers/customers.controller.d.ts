import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomersService } from './customers.service';
import { FindCustomersQueryDto } from './dto/find-customers-query.dto';
import { FindCustomerOrdersQueryDto } from './dto/find-customer-orders-query.dto';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    create(createCustomerDto: CreateCustomerDto): Promise<import("./entities/customer.entity").Customer>;
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
    findAll(query: FindCustomersQueryDto): Promise<{
        query: string | null;
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        items: import("./entities/customer.entity").Customer[];
    }>;
    findOne(id: string): Promise<import("./entities/customer.entity").Customer>;
    update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<import("./entities/customer.entity").Customer>;
}
