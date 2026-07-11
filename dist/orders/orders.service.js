"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customers_service_1 = require("../customers/customers.service");
const payment_setting_entity_1 = require("../payment-settings/entities/payment-setting.entity");
const product_entity_1 = require("../products/entities/product.entity");
const order_item_entity_1 = require("./entities/order-item.entity");
const order_entity_1 = require("./entities/order.entity");
const order_status_enum_1 = require("./enums/order-status.enum");
let OrdersService = class OrdersService {
    orderRepository;
    orderItemRepository;
    productRepository;
    paymentSettingRepository;
    customersService;
    constructor(orderRepository, orderItemRepository, productRepository, paymentSettingRepository, customersService) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.paymentSettingRepository = paymentSettingRepository;
        this.customersService = customersService;
    }
    async create(createOrderDto) {
        const paymentSetting = await this.paymentSettingRepository.findOne({
            where: {
                method: createOrderDto.paymentMethod,
                isActive: true,
            },
        });
        if (!paymentSetting) {
            throw new common_1.BadRequestException('Payment method is not available');
        }
        const customer = await this.customersService.findOrCreate({
            fullName: createOrderDto.customer.fullName,
            email: createOrderDto.customer.email,
            phone: createOrderDto.customer.phone,
            defaultAddress: createOrderDto.customer.defaultAddress ??
                createOrderDto.shippingAddress,
        });
        const productIds = createOrderDto.items.map((item) => item.productId);
        const products = await this.productRepository.find({
            where: {
                id: (0, typeorm_2.In)(productIds),
                isActive: true,
                category: {
                    isActive: true,
                },
            },
            relations: {
                category: true,
            },
        });
        if (products.length !== productIds.length) {
            throw new common_1.BadRequestException('One or more products are not available');
        }
        const productMap = new Map(products.map((product) => [product.id, product]));
        const subtotal = createOrderDto.items.reduce((sum, item) => {
            const product = productMap.get(item.productId);
            if (!product) {
                return sum;
            }
            const unitPrice = product.salePrice
                ? Number(product.salePrice)
                : Number(product.price);
            return sum + unitPrice * item.quantity;
        }, 0);
        const shippingFee = createOrderDto.shippingFee ?? 0;
        const totalAmount = subtotal + shippingFee;
        const orderCode = await this.generateOrderCode();
        const order = this.orderRepository.create({
            customerId: customer.id,
            orderCode,
            customerName: customer.fullName,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            shippingAddress: createOrderDto.shippingAddress,
            note: createOrderDto.note,
            subtotal: subtotal.toFixed(2),
            shippingFee: shippingFee.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            paymentMethod: createOrderDto.paymentMethod,
            paymentReference: createOrderDto.paymentReference,
            paymentProofUrl: createOrderDto.paymentProofUrl,
            status: order_status_enum_1.OrderStatus.PENDING_PAYMENT,
            submittedAt: new Date(),
        });
        const savedOrder = await this.orderRepository.save(order);
        const orderItems = createOrderDto.items.map((item) => {
            const product = productMap.get(item.productId);
            if (!product) {
                throw new common_1.NotFoundException('Product not found');
            }
            const unitPrice = product.salePrice
                ? Number(product.salePrice)
                : Number(product.price);
            return this.orderItemRepository.create({
                orderId: savedOrder.id,
                productId: product.id,
                productCode: product.productCode,
                productName: product.name,
                productThumbnailUrl: product.thumbnailUrl,
                quantity: item.quantity,
                unitPrice: unitPrice.toFixed(2),
                totalPrice: (unitPrice * item.quantity).toFixed(2),
            });
        });
        await this.orderItemRepository.save(orderItems);
        return this.findOne(savedOrder.id);
    }
    async findOne(id) {
        const order = await this.orderRepository.findOne({
            where: { id },
            relations: {
                customer: true,
                items: true,
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        return this.toOrderResponse(order);
    }
    async generateOrderCode() {
        const latestOrder = await this.orderRepository
            .createQueryBuilder('order')
            .where('order.orderCode LIKE :pattern', {
            pattern: 'ORD-%',
        })
            .orderBy('order.orderCode', 'DESC')
            .getOne();
        const latestNumber = latestOrder?.orderCode
            ? Number(latestOrder.orderCode.split('-')[1])
            : 0;
        const nextNumber = latestNumber + 1;
        return `ORD-${String(nextNumber).padStart(6, '0')}`;
    }
    toOrderResponse(order) {
        return {
            id: order.id,
            orderCode: order.orderCode,
            customer: {
                id: order.customer?.id,
                customerCode: order.customer?.customerCode,
                fullName: order.customerName,
                email: order.customerEmail,
                phone: order.customerPhone,
            },
            shippingAddress: order.shippingAddress,
            note: order.note,
            subtotal: Number(order.subtotal),
            shippingFee: Number(order.shippingFee),
            totalAmount: Number(order.totalAmount),
            paymentMethod: order.paymentMethod,
            paymentReference: order.paymentReference,
            paymentProofUrl: order.paymentProofUrl,
            status: order.status,
            submittedAt: order.submittedAt,
            doneAt: order.doneAt,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            items: order.items?.map((item) => ({
                id: item.id,
                productId: item.productId,
                productCode: item.productCode,
                productName: item.productName,
                productThumbnailUrl: item.productThumbnailUrl,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice),
            })),
        };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(order_item_entity_1.OrderItem)),
    __param(2, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(3, (0, typeorm_1.InjectRepository)(payment_setting_entity_1.PaymentSetting)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        customers_service_1.CustomersService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map