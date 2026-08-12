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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const decimal_js_1 = __importDefault(require("decimal.js"));
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customers_service_1 = require("../customers/customers.service");
const payment_setting_entity_1 = require("../payment-settings/entities/payment-setting.entity");
const product_entity_1 = require("../products/entities/product.entity");
const order_item_entity_1 = require("./entities/order-item.entity");
const order_entity_1 = require("./entities/order.entity");
const order_status_enum_1 = require("./enums/order-status.enum");
const node_crypto_1 = require("node:crypto");
const business_time_service_1 = require("../common/time/business-time.service");
const luxon_1 = require("luxon");
let OrdersService = class OrdersService {
    orderRepository;
    orderItemRepository;
    productRepository;
    paymentSettingRepository;
    customersService;
    dataSource;
    businessTimeService;
    constructor(orderRepository, orderItemRepository, productRepository, paymentSettingRepository, customersService, dataSource, businessTimeService) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.paymentSettingRepository = paymentSettingRepository;
        this.customersService = customersService;
        this.dataSource = dataSource;
        this.businessTimeService = businessTimeService;
    }
    allowedStatusTransitions = {
        [order_status_enum_1.OrderStatus.PENDING_PAYMENT]: [order_status_enum_1.OrderStatus.CANCELLED],
        [order_status_enum_1.OrderStatus.NEW]: [order_status_enum_1.OrderStatus.DONE, order_status_enum_1.OrderStatus.CANCELLED],
        [order_status_enum_1.OrderStatus.DONE]: [],
        [order_status_enum_1.OrderStatus.CANCELLED]: [],
    };
    async create(createOrderDto) {
        if (!createOrderDto.items?.length) {
            throw new common_1.BadRequestException('Order must contain at least one product');
        }
        const uniqueProductIds = new Set(createOrderDto.items.map((item) => item.productId));
        if (uniqueProductIds.size !== createOrderDto.items.length) {
            throw new common_1.BadRequestException('Duplicate products are not allowed');
        }
        let shippingFee;
        try {
            shippingFee = new decimal_js_1.default(createOrderDto.shippingFee ?? '0');
        }
        catch {
            throw new common_1.BadRequestException('Invalid shipping fee');
        }
        if (!shippingFee.isFinite() || shippingFee.isNegative()) {
            throw new common_1.BadRequestException('Shipping fee must be greater than or equal to zero');
        }
        const productIds = [...uniqueProductIds];
        const savedOrderId = await this.dataSource.transaction(async (manager) => {
            const paymentSettingRepository = manager.withRepository(this.paymentSettingRepository);
            const productRepository = manager.withRepository(this.productRepository);
            const orderRepository = manager.withRepository(this.orderRepository);
            const orderItemRepository = manager.withRepository(this.orderItemRepository);
            const paymentSetting = await paymentSettingRepository.findOne({
                where: {
                    method: createOrderDto.paymentMethod,
                    isActive: true,
                },
            });
            if (!paymentSetting) {
                throw new common_1.BadRequestException('Payment method is not available');
            }
            const products = await productRepository.find({
                where: {
                    id: (0, typeorm_2.In)(productIds),
                    isActive: true,
                    subcategory: {
                        isActive: true,
                        category: {
                            isActive: true,
                        },
                    },
                },
                relations: {
                    subcategory: {
                        category: true,
                    },
                },
            });
            if (products.length !== productIds.length) {
                throw new common_1.BadRequestException('One or more products are not available');
            }
            const productMap = new Map(products.map((product) => [product.id, product]));
            const resolvedItems = createOrderDto.items.map((item) => {
                const product = productMap.get(item.productId);
                if (!product) {
                    throw new common_1.BadRequestException(`Product ${item.productId} is not available`);
                }
                let unitPrice;
                try {
                    unitPrice = new decimal_js_1.default(product.salePrice ?? product.price);
                }
                catch {
                    throw new common_1.BadRequestException(`Product ${product.id} has an invalid price`);
                }
                if (!unitPrice.isFinite() || unitPrice.isNegative()) {
                    throw new common_1.BadRequestException(`Product ${product.id} has an invalid price`);
                }
                return {
                    product,
                    quantity: item.quantity,
                    unitPrice,
                    totalPrice: unitPrice.mul(item.quantity),
                };
            });
            const subtotal = resolvedItems.reduce((total, item) => total.plus(item.totalPrice), new decimal_js_1.default(0));
            const totalAmount = subtotal.plus(shippingFee);
            const customer = await this.customersService.findOrCreate({
                fullName: createOrderDto.customer.fullName,
                email: createOrderDto.customer.email,
                phone: createOrderDto.customer.phone,
                defaultAddress: createOrderDto.customer.defaultAddress ??
                    createOrderDto.shippingAddress,
            }, manager);
            const normalizedPhone = this.normalizePhone(createOrderDto.customer.phone);
            const orderCode = await this.generateOrderCode(orderRepository);
            const expiresAt = luxon_1.DateTime.utc().plus({ minutes: 30 }).toJSDate();
            const order = orderRepository.create({
                customerId: customer.id,
                orderCode,
                customerName: customer.fullName,
                customerEmail: customer.email,
                customerPhone: normalizedPhone,
                shippingAddress: createOrderDto.shippingAddress,
                note: createOrderDto.note,
                subtotal: subtotal.toFixed(2),
                shippingFee: shippingFee.toFixed(2),
                totalAmount: totalAmount.toFixed(2),
                paymentMethod: createOrderDto.paymentMethod,
                status: order_status_enum_1.OrderStatus.PENDING_PAYMENT,
                submittedAt: null,
                expiresAt,
            });
            const savedOrder = await orderRepository.save(order);
            const orderItems = resolvedItems.map(({ product, quantity, unitPrice, totalPrice }) => orderItemRepository.create({
                orderId: savedOrder.id,
                productId: product.id,
                productCode: product.productCode,
                productName: product.name,
                productThumbnailUrl: product.thumbnailUrl,
                quantity,
                unitPrice: unitPrice.toFixed(2),
                totalPrice: totalPrice.toFixed(2),
            }));
            await orderItemRepository.save(orderItems);
            return savedOrder.id;
        });
        return this.findOne(savedOrderId);
    }
    async createByAdmin(createOrderDto) {
        if (!createOrderDto.items?.length) {
            throw new common_1.BadRequestException('Order must contain at least one product');
        }
        const uniqueProductIds = new Set(createOrderDto.items.map((item) => item.productId));
        if (uniqueProductIds.size !== createOrderDto.items.length) {
            throw new common_1.BadRequestException('Duplicate products are not allowed');
        }
        let shippingFee;
        try {
            shippingFee = new decimal_js_1.default(createOrderDto.shippingFee ?? '0');
        }
        catch {
            throw new common_1.BadRequestException('Invalid shipping fee');
        }
        if (!shippingFee.isFinite() || shippingFee.isNegative()) {
            throw new common_1.BadRequestException('Shipping fee must be greater than or equal to zero');
        }
        const productIds = [...uniqueProductIds];
        const savedOrderId = await this.dataSource.transaction(async (manager) => {
            const paymentSettingRepository = manager.withRepository(this.paymentSettingRepository);
            const productRepository = manager.withRepository(this.productRepository);
            const orderRepository = manager.withRepository(this.orderRepository);
            const orderItemRepository = manager.withRepository(this.orderItemRepository);
            const paymentSetting = await paymentSettingRepository.findOne({
                where: {
                    method: createOrderDto.paymentMethod,
                    isActive: true,
                },
            });
            if (!paymentSetting) {
                throw new common_1.BadRequestException('Payment method is not available');
            }
            const products = await productRepository.find({
                where: {
                    id: (0, typeorm_2.In)(productIds),
                    isActive: true,
                    subcategory: {
                        isActive: true,
                        category: {
                            isActive: true,
                        },
                    },
                },
                relations: {
                    subcategory: {
                        category: true,
                    },
                },
            });
            if (products.length !== productIds.length) {
                throw new common_1.BadRequestException('One or more products are not available');
            }
            const productMap = new Map(products.map((product) => [product.id, product]));
            const resolvedItems = createOrderDto.items.map((item) => {
                const product = productMap.get(item.productId);
                if (!product) {
                    throw new common_1.BadRequestException(`Product ${item.productId} is not available`);
                }
                let unitPrice;
                try {
                    unitPrice = new decimal_js_1.default(product.salePrice ?? product.price);
                }
                catch {
                    throw new common_1.BadRequestException(`Product ${product.id} has an invalid price`);
                }
                if (!unitPrice.isFinite() || unitPrice.isNegative()) {
                    throw new common_1.BadRequestException(`Product ${product.id} has an invalid price`);
                }
                return {
                    product,
                    quantity: item.quantity,
                    unitPrice,
                    totalPrice: unitPrice.mul(item.quantity),
                };
            });
            const subtotal = resolvedItems.reduce((total, item) => total.plus(item.totalPrice), new decimal_js_1.default(0));
            const totalAmount = subtotal.plus(shippingFee);
            const customer = await this.customersService.findOrCreate({
                fullName: createOrderDto.customer.fullName,
                email: createOrderDto.customer.email,
                phone: createOrderDto.customer.phone,
                defaultAddress: createOrderDto.customer.defaultAddress ??
                    createOrderDto.shippingAddress,
            }, manager);
            const normalizedPhone = this.normalizePhone(createOrderDto.customer.phone);
            const orderCode = await this.generateOrderCode(orderRepository);
            const submittedAt = luxon_1.DateTime.utc().toJSDate();
            const order = orderRepository.create({
                customerId: customer.id,
                orderCode,
                customerName: customer.fullName,
                customerEmail: customer.email,
                customerPhone: normalizedPhone,
                shippingAddress: createOrderDto.shippingAddress,
                note: createOrderDto.note,
                subtotal: subtotal.toFixed(2),
                shippingFee: shippingFee.toFixed(2),
                totalAmount: totalAmount.toFixed(2),
                paymentMethod: createOrderDto.paymentMethod,
                status: order_status_enum_1.OrderStatus.NEW,
                submittedAt,
                expiresAt: null,
            });
            const savedOrder = await orderRepository.save(order);
            const orderItems = resolvedItems.map(({ product, quantity, unitPrice, totalPrice }) => orderItemRepository.create({
                orderId: savedOrder.id,
                productId: product.id,
                productCode: product.productCode,
                productName: product.name,
                productThumbnailUrl: product.thumbnailUrl,
                quantity,
                unitPrice: unitPrice.toFixed(2),
                totalPrice: totalPrice.toFixed(2),
            }));
            await orderItemRepository.save(orderItems);
            return savedOrder.id;
        });
        return this.findOne(savedOrderId);
    }
    async lookup(orderCode, phone) {
        const normalizedOrderCode = orderCode.trim().toUpperCase();
        const normalizedPhone = this.normalizePhone(phone);
        const order = await this.orderRepository.findOne({
            where: {
                orderCode: normalizedOrderCode,
                customerPhone: normalizedPhone,
            },
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
    async findAll() {
        const orders = await this.orderRepository.find({
            relations: {
                customer: true,
                items: true,
            },
            order: {
                createdAt: 'DESC',
            },
        });
        return orders.map((order) => this.toOrderResponse(order));
    }
    async findByCalendarDateRange(from, to) {
        const businessTimeZone = this.businessTimeService.timezone;
        const { fromDate, toDate } = this.businessTimeService.getDateRange(from, to, 42);
        const calendarDateExpression = `
    CASE
      WHEN "orders"."status" = :pendingStatus
        THEN "orders"."created_at"

      WHEN "orders"."status" = :newStatus
        THEN "orders"."submitted_at"

      WHEN "orders"."status" = :doneStatus
        THEN "orders"."done_at"

      WHEN "orders"."status" = :cancelledStatus
        THEN "orders"."updated_at"
    END
  `;
        const localCalendarDateExpression = `
    timezone(
      :businessTimeZone,
      (${calendarDateExpression})
    )::date
  `;
        const rawCounts = await this.orderRepository
            .createQueryBuilder('orders')
            .select(`
        TO_CHAR(
          ${localCalendarDateExpression},
          'YYYY-MM-DD'
        )
      `, 'date')
            .addSelect(`
        COUNT(*) FILTER (
          WHERE "orders"."status" = :pendingStatus
        )
      `, 'pending')
            .addSelect(`
        COUNT(*) FILTER (
          WHERE "orders"."status" = :newStatus
        )
      `, 'new')
            .addSelect(`
        COUNT(*) FILTER (
          WHERE "orders"."status" = :doneStatus
        )
      `, 'done')
            .addSelect(`
        COUNT(*) FILTER (
          WHERE "orders"."status" = :cancelledStatus
        )
      `, 'cancelled')
            .where(`(${calendarDateExpression}) >= :fromDate`)
            .andWhere(`(${calendarDateExpression}) < :toDate`)
            .setParameters({
            pendingStatus: order_status_enum_1.OrderStatus.PENDING_PAYMENT,
            newStatus: order_status_enum_1.OrderStatus.NEW,
            doneStatus: order_status_enum_1.OrderStatus.DONE,
            cancelledStatus: order_status_enum_1.OrderStatus.CANCELLED,
            businessTimeZone,
            fromDate,
            toDate,
        })
            .groupBy(localCalendarDateExpression)
            .getRawMany();
        const countsByDate = new Map(rawCounts.map((row) => [
            row.date,
            {
                pending: Number(row.pending),
                new: Number(row.new),
                done: Number(row.done),
                cancelled: Number(row.cancelled),
            },
        ]));
        const calculatePercentage = (count, total) => {
            if (total === 0) {
                return 0;
            }
            return Math.round((count / total) * 100 * 100) / 100;
        };
        const buildCalendarDay = (date, counts) => {
            const total = counts.pending + counts.new + counts.done + counts.cancelled;
            return {
                date,
                total,
                ...counts,
                percentages: {
                    pending: calculatePercentage(counts.pending, total),
                    new: calculatePercentage(counts.new, total),
                    done: calculatePercentage(counts.done, total),
                    cancelled: calculatePercentage(counts.cancelled, total),
                },
            };
        };
        const days = [];
        let cursor = luxon_1.DateTime.fromISO(from, {
            zone: businessTimeZone,
        }).startOf('day');
        const endDate = luxon_1.DateTime.fromISO(to, {
            zone: businessTimeZone,
        }).startOf('day');
        while (cursor.toMillis() < endDate.toMillis()) {
            const date = cursor.toISODate();
            if (!date) {
                throw new common_1.BadRequestException('Unable to generate calendar date');
            }
            const counts = countsByDate.get(date) ?? {
                pending: 0,
                new: 0,
                done: 0,
                cancelled: 0,
            };
            days.push(buildCalendarDay(date, counts));
            cursor = cursor.plus({ days: 1 });
        }
        const summary = days.reduce((result, day) => {
            result.total += day.total;
            result.pending += day.pending;
            result.new += day.new;
            result.done += day.done;
            result.cancelled += day.cancelled;
            return result;
        }, {
            total: 0,
            pending: 0,
            new: 0,
            done: 0,
            cancelled: 0,
        });
        return {
            from,
            to,
            timezone: businessTimeZone,
            summary,
            days,
        };
    }
    async findByCalendarDate(date, status) {
        if (status !== undefined && !Object.values(order_status_enum_1.OrderStatus).includes(status)) {
            throw new common_1.BadRequestException(`Invalid order status: ${status}`);
        }
        const businessTimeZone = this.businessTimeService.timezone;
        const { fromDate, toDate } = this.businessTimeService.getDayRange(date);
        const calendarDateExpression = `
    CASE
      WHEN "orders"."status" = :pendingStatus
        THEN "orders"."created_at"

      WHEN "orders"."status" = :newStatus
        THEN "orders"."submitted_at"

      WHEN "orders"."status" = :doneStatus
        THEN "orders"."done_at"

      WHEN "orders"."status" = :cancelledStatus
        THEN "orders"."updated_at"
    END
  `;
        const queryBuilder = this.orderRepository
            .createQueryBuilder('orders')
            .leftJoin('orders.items', 'items')
            .select('orders.id', 'id')
            .addSelect('orders.orderCode', 'order_code')
            .addSelect('orders.customerName', 'customer_name')
            .addSelect('orders.customerPhone', 'customer_phone')
            .addSelect('orders.totalAmount', 'total_amount')
            .addSelect('orders.paymentMethod', 'payment_method')
            .addSelect('orders.status', 'status')
            .addSelect(calendarDateExpression, 'status_at')
            .addSelect('COUNT(items.id)', 'item_count')
            .addSelect('COALESCE(SUM(items.quantity), 0)', 'total_quantity')
            .where(`(${calendarDateExpression}) >= :fromDate`)
            .andWhere(`(${calendarDateExpression}) < :toDate`)
            .setParameters({
            pendingStatus: order_status_enum_1.OrderStatus.PENDING_PAYMENT,
            newStatus: order_status_enum_1.OrderStatus.NEW,
            doneStatus: order_status_enum_1.OrderStatus.DONE,
            cancelledStatus: order_status_enum_1.OrderStatus.CANCELLED,
            fromDate,
            toDate,
        });
        if (status !== undefined) {
            queryBuilder.andWhere('"orders"."status" = :filterStatus', {
                filterStatus: status,
            });
        }
        const orders = await queryBuilder
            .groupBy('orders.id')
            .orderBy('status_at', 'DESC')
            .getRawMany();
        return {
            date,
            timezone: businessTimeZone,
            status: status ?? null,
            total: orders.length,
            orders: orders.map((order) => ({
                id: order.id,
                orderCode: order.order_code,
                customerName: order.customer_name,
                customerPhone: order.customer_phone,
                totalAmount: order.total_amount,
                paymentMethod: order.payment_method,
                status: order.status,
                statusAt: order.status_at,
                itemCount: Number(order.item_count),
                totalQuantity: Number(order.total_quantity),
            })),
        };
    }
    async updateInfo(id, dto) {
        const order = await this.orderRepository.findOne({
            where: { id },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        const canUpdate = order.status === order_status_enum_1.OrderStatus.PENDING_PAYMENT ||
            order.status === order_status_enum_1.OrderStatus.NEW;
        if (!canUpdate) {
            throw new common_1.BadRequestException(`Order information cannot be updated when status is ${order.status}`);
        }
        const now = luxon_1.DateTime.utc();
        if (order.status === order_status_enum_1.OrderStatus.PENDING_PAYMENT &&
            order.expiresAt &&
            order.expiresAt.getTime() <= now.toMillis()) {
            order.status = order_status_enum_1.OrderStatus.CANCELLED;
            await this.orderRepository.save(order);
            throw new common_1.BadRequestException('The order payment time has expired');
        }
        const hasUpdates = dto.customerName !== undefined ||
            dto.customerEmail !== undefined ||
            dto.customerPhone !== undefined ||
            dto.shippingAddress !== undefined ||
            dto.note !== undefined;
        if (!hasUpdates) {
            throw new common_1.BadRequestException('At least one field must be provided');
        }
        if (dto.customerName !== undefined) {
            const customerName = dto.customerName.trim();
            if (!customerName) {
                throw new common_1.BadRequestException('Customer name cannot be empty');
            }
            order.customerName = customerName;
        }
        if (dto.customerEmail !== undefined) {
            order.customerEmail =
                dto.customerEmail === null
                    ? null
                    : dto.customerEmail.trim().toLowerCase();
        }
        if (dto.customerPhone !== undefined) {
            order.customerPhone = this.normalizePhone(dto.customerPhone);
        }
        if (dto.shippingAddress !== undefined) {
            const shippingAddress = dto.shippingAddress.trim();
            if (!shippingAddress) {
                throw new common_1.BadRequestException('Shipping address cannot be empty');
            }
            order.shippingAddress = shippingAddress;
        }
        if (dto.note !== undefined) {
            if (dto.note === null) {
                order.note = null;
            }
            else {
                const note = dto.note.trim();
                order.note = note || null;
            }
        }
        const savedOrder = await this.orderRepository.save(order);
        return this.findOne(savedOrder.id);
    }
    async updateItems(id, dto) {
        if (!dto.items?.length) {
            throw new common_1.BadRequestException('Order must contain at least one product');
        }
        const uniqueProductIds = new Set(dto.items.map((item) => item.productId));
        if (uniqueProductIds.size !== dto.items.length) {
            throw new common_1.BadRequestException('Duplicate products are not allowed');
        }
        const productIds = [...uniqueProductIds];
        const result = await this.dataSource.transaction(async (manager) => {
            const orderRepository = manager.withRepository(this.orderRepository);
            const orderItemRepository = manager.withRepository(this.orderItemRepository);
            const productRepository = manager.withRepository(this.productRepository);
            const order = await orderRepository.findOne({
                where: { id },
                lock: {
                    mode: 'pessimistic_write',
                },
            });
            if (!order) {
                throw new common_1.NotFoundException('Order not found');
            }
            if (order.status !== order_status_enum_1.OrderStatus.PENDING_PAYMENT) {
                throw new common_1.BadRequestException('Items can only be updated for pending payment orders');
            }
            if (order.expiresAt &&
                order.expiresAt.getTime() <= luxon_1.DateTime.utc().toMillis()) {
                order.status = order_status_enum_1.OrderStatus.CANCELLED;
                await orderRepository.save(order);
                return {
                    expired: true,
                };
            }
            const products = await productRepository.find({
                where: {
                    id: (0, typeorm_2.In)(productIds),
                    isActive: true,
                    subcategory: {
                        isActive: true,
                        category: {
                            isActive: true,
                        },
                    },
                },
                relations: {
                    subcategory: {
                        category: true,
                    },
                },
            });
            if (products.length !== productIds.length) {
                throw new common_1.BadRequestException('One or more products are not available');
            }
            const productMap = new Map(products.map((product) => [product.id, product]));
            const resolvedItems = dto.items.map((item) => {
                const product = productMap.get(item.productId);
                if (!product) {
                    throw new common_1.BadRequestException(`Product ${item.productId} is not available`);
                }
                let unitPrice;
                try {
                    unitPrice = new decimal_js_1.default(product.salePrice ?? product.price);
                }
                catch {
                    throw new common_1.BadRequestException(`Product ${product.id} has an invalid price`);
                }
                if (!unitPrice.isFinite() || unitPrice.isNegative()) {
                    throw new common_1.BadRequestException(`Product ${product.id} has an invalid price`);
                }
                const totalPrice = unitPrice.mul(item.quantity);
                return {
                    product,
                    quantity: item.quantity,
                    unitPrice,
                    totalPrice,
                };
            });
            const subtotal = resolvedItems.reduce((total, item) => total.plus(item.totalPrice), new decimal_js_1.default(0));
            let shippingFee;
            try {
                shippingFee = new decimal_js_1.default(order.shippingFee ?? '0');
            }
            catch {
                throw new common_1.BadRequestException('Order has an invalid shipping fee');
            }
            if (!shippingFee.isFinite() || shippingFee.isNegative()) {
                throw new common_1.BadRequestException('Order has an invalid shipping fee');
            }
            const totalAmount = subtotal.plus(shippingFee);
            await orderItemRepository.delete({
                orderId: order.id,
            });
            const newOrderItems = resolvedItems.map(({ product, quantity, unitPrice, totalPrice }) => orderItemRepository.create({
                orderId: order.id,
                productId: product.id,
                productCode: product.productCode,
                productName: product.name,
                productThumbnailUrl: product.thumbnailUrl,
                quantity,
                unitPrice: unitPrice.toFixed(2),
                totalPrice: totalPrice.toFixed(2),
            }));
            await orderItemRepository.save(newOrderItems);
            order.subtotal = subtotal.toFixed(2);
            order.totalAmount = totalAmount.toFixed(2);
            await orderRepository.save(order);
            return {
                expired: false,
                orderId: order.id,
            };
        });
        if (result.expired) {
            throw new common_1.BadRequestException('The order payment time has expired');
        }
        return this.findOne(result.orderId);
    }
    async updatePaymentProof(id, dto) {
        const order = await this.orderRepository.findOne({
            where: { id },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.status !== order_status_enum_1.OrderStatus.PENDING_PAYMENT) {
            throw new common_1.BadRequestException('Payment proof can only be submitted for pending payment orders');
        }
        const submittedAt = luxon_1.DateTime.utc().toJSDate();
        if (order.expiresAt && order.expiresAt.getTime() <= submittedAt.getTime()) {
            order.status = order_status_enum_1.OrderStatus.CANCELLED;
            await this.orderRepository.save(order);
            throw new common_1.BadRequestException('The payment submission time has expired');
        }
        order.paymentProofUrl = dto.paymentProofUrl;
        order.submittedAt = submittedAt;
        order.status = order_status_enum_1.OrderStatus.NEW;
        const savedOrder = await this.orderRepository.save(order);
        return this.findOne(savedOrder.id);
    }
    async updateStatus(id, updateOrderStatusDto) {
        const order = await this.orderRepository.findOne({
            where: { id },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        const previousStatus = order.status;
        const newStatus = updateOrderStatusDto.status;
        if (previousStatus === newStatus) {
            return this.findOne(order.id);
        }
        const allowedStatuses = this.allowedStatusTransitions[previousStatus] ?? [];
        if (!allowedStatuses.includes(newStatus)) {
            throw new common_1.BadRequestException(`Cannot change order status from ${previousStatus} to ${newStatus}`);
        }
        order.status = newStatus;
        if (newStatus === order_status_enum_1.OrderStatus.DONE) {
            order.doneAt = luxon_1.DateTime.utc().toJSDate();
        }
        const savedOrder = await this.orderRepository.save(order);
        return this.findOne(savedOrder.id);
    }
    async generateOrderCode(orderRepository) {
        const characters = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        const codeLength = 8;
        const maxAttempts = 10;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let code = '';
            for (let index = 0; index < codeLength; index++) {
                code += characters[(0, node_crypto_1.randomInt)(characters.length)];
            }
            const orderCode = `ORD-${code}`;
            const isExisting = await orderRepository.exists({
                where: { orderCode },
            });
            if (!isExisting) {
                return orderCode;
            }
        }
        throw new common_1.InternalServerErrorException('Unable to generate a unique order code');
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
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            totalAmount: order.totalAmount,
            paymentMethod: order.paymentMethod,
            paymentProofUrl: order.paymentProofUrl,
            status: order.status,
            submittedAt: order.submittedAt,
            doneAt: order.doneAt,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            expiresAt: order.expiresAt,
            items: (order.items ?? []).map((item) => ({
                id: item.id,
                productId: item.productId,
                productCode: item.productCode,
                productName: item.productName,
                productThumbnailUrl: item.productThumbnailUrl,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
            })),
        };
    }
    normalizePhone(phone) {
        const normalizedPhone = phone.replace(/\D/g, '');
        if (!/^\d{7,15}$/.test(normalizedPhone)) {
            throw new common_1.BadRequestException('Phone number must contain between 7 and 15 digits');
        }
        return normalizedPhone;
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
        customers_service_1.CustomersService,
        typeorm_2.DataSource,
        business_time_service_1.BusinessTimeService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map