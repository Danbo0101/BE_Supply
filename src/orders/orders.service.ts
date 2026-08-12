import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CustomersService } from '../customers/customers.service';
import { PaymentSetting } from '../payment-settings/entities/payment-setting.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { UpdateOrderPaymentProofDto } from './dto/update-order-payment-proof.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { randomInt } from 'node:crypto';
import { BusinessTimeService } from '../common/time/business-time.service';
import { DateTime } from 'luxon';
import { UpdateOrderInfoDto } from './dto/update-order-info.dto';
import { UpdateOrderItemsDto } from './dto/update-order-items.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(PaymentSetting)
    private readonly paymentSettingRepository: Repository<PaymentSetting>,

    private readonly customersService: CustomersService,

    private readonly dataSource: DataSource,

    private readonly businessTimeService: BusinessTimeService,
  ) {}

  private readonly allowedStatusTransitions: Record<
    OrderStatus,
    readonly OrderStatus[]
  > = {
    [OrderStatus.PENDING_PAYMENT]: [OrderStatus.CANCELLED],
    [OrderStatus.NEW]: [OrderStatus.DONE, OrderStatus.CANCELLED],
    [OrderStatus.DONE]: [],
    [OrderStatus.CANCELLED]: [],
  };

  async create(createOrderDto: CreateOrderDto) {
    if (!createOrderDto.items?.length) {
      throw new BadRequestException('Order must contain at least one product');
    }

    const uniqueProductIds = new Set(
      createOrderDto.items.map((item) => item.productId),
    );

    if (uniqueProductIds.size !== createOrderDto.items.length) {
      throw new BadRequestException('Duplicate products are not allowed');
    }

    let shippingFee: Decimal;

    try {
      shippingFee = new Decimal(createOrderDto.shippingFee ?? '0');
    } catch {
      throw new BadRequestException('Invalid shipping fee');
    }

    if (!shippingFee.isFinite() || shippingFee.isNegative()) {
      throw new BadRequestException(
        'Shipping fee must be greater than or equal to zero',
      );
    }

    const productIds = [...uniqueProductIds];

    const savedOrderId = await this.dataSource.transaction(async (manager) => {
      const paymentSettingRepository = manager.withRepository(
        this.paymentSettingRepository,
      );

      const productRepository = manager.withRepository(this.productRepository);

      const orderRepository = manager.withRepository(this.orderRepository);

      const orderItemRepository = manager.withRepository(
        this.orderItemRepository,
      );

      const paymentSetting = await paymentSettingRepository.findOne({
        where: {
          method: createOrderDto.paymentMethod,
          isActive: true,
        },
      });

      if (!paymentSetting) {
        throw new BadRequestException('Payment method is not available');
      }

      const products = await productRepository.find({
        where: {
          id: In(productIds),
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
        throw new BadRequestException('One or more products are not available');
      }

      const productMap = new Map(
        products.map((product) => [product.id, product]),
      );

      const resolvedItems = createOrderDto.items.map((item) => {
        const product = productMap.get(item.productId);

        if (!product) {
          throw new BadRequestException(
            `Product ${item.productId} is not available`,
          );
        }

        let unitPrice: Decimal;

        try {
          unitPrice = new Decimal(product.salePrice ?? product.price);
        } catch {
          throw new BadRequestException(
            `Product ${product.id} has an invalid price`,
          );
        }

        if (!unitPrice.isFinite() || unitPrice.isNegative()) {
          throw new BadRequestException(
            `Product ${product.id} has an invalid price`,
          );
        }

        return {
          product,
          quantity: item.quantity,
          unitPrice,
          totalPrice: unitPrice.mul(item.quantity),
        };
      });

      const subtotal = resolvedItems.reduce(
        (total, item) => total.plus(item.totalPrice),
        new Decimal(0),
      );

      const totalAmount = subtotal.plus(shippingFee);

      const customer = await this.customersService.findOrCreate(
        {
          fullName: createOrderDto.customer.fullName,
          email: createOrderDto.customer.email,
          phone: createOrderDto.customer.phone,
          defaultAddress:
            createOrderDto.customer.defaultAddress ??
            createOrderDto.shippingAddress,
        },
        manager,
      );

      const normalizedPhone = this.normalizePhone(
        createOrderDto.customer.phone,
      );

      const orderCode = await this.generateOrderCode(orderRepository);

      const expiresAt = DateTime.utc().plus({ minutes: 30 }).toJSDate();

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
        status: OrderStatus.PENDING_PAYMENT,
        submittedAt: null,
        expiresAt,
      });

      const savedOrder = await orderRepository.save(order);

      const orderItems = resolvedItems.map(
        ({ product, quantity, unitPrice, totalPrice }) =>
          orderItemRepository.create({
            orderId: savedOrder.id,
            productId: product.id,
            productCode: product.productCode,
            productName: product.name,
            productThumbnailUrl: product.thumbnailUrl,
            quantity,
            unitPrice: unitPrice.toFixed(2),
            totalPrice: totalPrice.toFixed(2),
          }),
      );

      await orderItemRepository.save(orderItems);

      return savedOrder.id;
    });

    return this.findOne(savedOrderId);
  }

  async createByAdmin(createOrderDto: CreateOrderDto) {
    if (!createOrderDto.items?.length) {
      throw new BadRequestException('Order must contain at least one product');
    }

    const uniqueProductIds = new Set(
      createOrderDto.items.map((item) => item.productId),
    );

    if (uniqueProductIds.size !== createOrderDto.items.length) {
      throw new BadRequestException('Duplicate products are not allowed');
    }

    let shippingFee: Decimal;

    try {
      shippingFee = new Decimal(createOrderDto.shippingFee ?? '0');
    } catch {
      throw new BadRequestException('Invalid shipping fee');
    }

    if (!shippingFee.isFinite() || shippingFee.isNegative()) {
      throw new BadRequestException(
        'Shipping fee must be greater than or equal to zero',
      );
    }

    const productIds = [...uniqueProductIds];

    const savedOrderId = await this.dataSource.transaction(async (manager) => {
      const paymentSettingRepository = manager.withRepository(
        this.paymentSettingRepository,
      );

      const productRepository = manager.withRepository(this.productRepository);

      const orderRepository = manager.withRepository(this.orderRepository);

      const orderItemRepository = manager.withRepository(
        this.orderItemRepository,
      );

      const paymentSetting = await paymentSettingRepository.findOne({
        where: {
          method: createOrderDto.paymentMethod,
          isActive: true,
        },
      });

      if (!paymentSetting) {
        throw new BadRequestException('Payment method is not available');
      }

      const products = await productRepository.find({
        where: {
          id: In(productIds),
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
        throw new BadRequestException('One or more products are not available');
      }

      const productMap = new Map(
        products.map((product) => [product.id, product]),
      );

      const resolvedItems = createOrderDto.items.map((item) => {
        const product = productMap.get(item.productId);

        if (!product) {
          throw new BadRequestException(
            `Product ${item.productId} is not available`,
          );
        }

        let unitPrice: Decimal;

        try {
          unitPrice = new Decimal(product.salePrice ?? product.price);
        } catch {
          throw new BadRequestException(
            `Product ${product.id} has an invalid price`,
          );
        }

        if (!unitPrice.isFinite() || unitPrice.isNegative()) {
          throw new BadRequestException(
            `Product ${product.id} has an invalid price`,
          );
        }

        return {
          product,
          quantity: item.quantity,
          unitPrice,
          totalPrice: unitPrice.mul(item.quantity),
        };
      });

      const subtotal = resolvedItems.reduce(
        (total, item) => total.plus(item.totalPrice),
        new Decimal(0),
      );

      const totalAmount = subtotal.plus(shippingFee);

      const customer = await this.customersService.findOrCreate(
        {
          fullName: createOrderDto.customer.fullName,
          email: createOrderDto.customer.email,
          phone: createOrderDto.customer.phone,
          defaultAddress:
            createOrderDto.customer.defaultAddress ??
            createOrderDto.shippingAddress,
        },
        manager,
      );

      const normalizedPhone = this.normalizePhone(
        createOrderDto.customer.phone,
      );

      const orderCode = await this.generateOrderCode(orderRepository);

      // Admin chỉ tạo sau khi đã nhận thanh toán.
      const submittedAt = DateTime.utc().toJSDate();

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

        status: OrderStatus.NEW,
        submittedAt,
        expiresAt: null,
      });

      const savedOrder = await orderRepository.save(order);

      const orderItems = resolvedItems.map(
        ({ product, quantity, unitPrice, totalPrice }) =>
          orderItemRepository.create({
            orderId: savedOrder.id,
            productId: product.id,
            productCode: product.productCode,
            productName: product.name,
            productThumbnailUrl: product.thumbnailUrl,
            quantity,
            unitPrice: unitPrice.toFixed(2),
            totalPrice: totalPrice.toFixed(2),
          }),
      );

      await orderItemRepository.save(orderItems);

      return savedOrder.id;
    });

    return this.findOne(savedOrderId);
  }

  async lookup(orderCode: string, phone: string) {
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
      throw new NotFoundException('Order not found');
    }

    return this.toOrderResponse(order);
  }

  async findOne(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: {
        customer: true,
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
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

  async findByCalendarDateRange(from: string, to: string) {
    type StatusCounts = {
      pending: number;
      new: number;
      done: number;
      cancelled: number;
    };

    type CalendarDayCount = StatusCounts & {
      date: string;
      total: number;
      percentages: StatusCounts;
    };

    type CalendarSummary = StatusCounts & {
      total: number;
    };

    type CalendarCountRow = {
      date: string;
      pending: string;
      new: string;
      done: string;
      cancelled: string;
    };

    const businessTimeZone = this.businessTimeService.timezone;

    const { fromDate, toDate } = this.businessTimeService.getDateRange(
      from,
      to,
      42,
    );

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

    /*
     * Timestamp trong database là UTC/timestamptz.
     * Chuyển nó sang ngày địa phương của cửa hàng
     * trước khi group.
     */
    const localCalendarDateExpression = `
    timezone(
      :businessTimeZone,
      (${calendarDateExpression})
    )::date
  `;

    const rawCounts = await this.orderRepository
      .createQueryBuilder('orders')
      .select(
        `
        TO_CHAR(
          ${localCalendarDateExpression},
          'YYYY-MM-DD'
        )
      `,
        'date',
      )
      .addSelect(
        `
        COUNT(*) FILTER (
          WHERE "orders"."status" = :pendingStatus
        )
      `,
        'pending',
      )
      .addSelect(
        `
        COUNT(*) FILTER (
          WHERE "orders"."status" = :newStatus
        )
      `,
        'new',
      )
      .addSelect(
        `
        COUNT(*) FILTER (
          WHERE "orders"."status" = :doneStatus
        )
      `,
        'done',
      )
      .addSelect(
        `
        COUNT(*) FILTER (
          WHERE "orders"."status" = :cancelledStatus
        )
      `,
        'cancelled',
      )
      .where(`(${calendarDateExpression}) >= :fromDate`)
      .andWhere(`(${calendarDateExpression}) < :toDate`)
      .setParameters({
        pendingStatus: OrderStatus.PENDING_PAYMENT,
        newStatus: OrderStatus.NEW,
        doneStatus: OrderStatus.DONE,
        cancelledStatus: OrderStatus.CANCELLED,
        businessTimeZone,
        fromDate,
        toDate,
      })
      .groupBy(localCalendarDateExpression)
      .getRawMany<CalendarCountRow>();

    const countsByDate = new Map<string, StatusCounts>(
      rawCounts.map((row) => [
        row.date,
        {
          pending: Number(row.pending),
          new: Number(row.new),
          done: Number(row.done),
          cancelled: Number(row.cancelled),
        },
      ]),
    );

    const calculatePercentage = (count: number, total: number) => {
      if (total === 0) {
        return 0;
      }

      return Math.round((count / total) * 100 * 100) / 100;
    };

    const buildCalendarDay = (
      date: string,
      counts: StatusCounts,
    ): CalendarDayCount => {
      const total =
        counts.pending + counts.new + counts.done + counts.cancelled;

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

    const days: CalendarDayCount[] = [];

    /*
     * Dùng Luxon cộng từng ngày địa phương.
     * Không cộng cứng 24 giờ vì ngày DST có thể
     * dài 23 hoặc 25 giờ.
     */
    let cursor = DateTime.fromISO(from, {
      zone: businessTimeZone,
    }).startOf('day');

    const endDate = DateTime.fromISO(to, {
      zone: businessTimeZone,
    }).startOf('day');

    while (cursor.toMillis() < endDate.toMillis()) {
      const date = cursor.toISODate();

      if (!date) {
        throw new BadRequestException('Unable to generate calendar date');
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

    const summary = days.reduce<CalendarSummary>(
      (result, day) => {
        result.total += day.total;
        result.pending += day.pending;
        result.new += day.new;
        result.done += day.done;
        result.cancelled += day.cancelled;

        return result;
      },
      {
        total: 0,
        pending: 0,
        new: 0,
        done: 0,
        cancelled: 0,
      },
    );

    return {
      from,
      to,
      timezone: businessTimeZone,
      summary,
      days,
    };
  }

  async findByCalendarDate(date: string, status?: OrderStatus) {
    if (status !== undefined && !Object.values(OrderStatus).includes(status)) {
      throw new BadRequestException(`Invalid order status: ${status}`);
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

    type RawCalendarOrder = {
      id: string;
      order_code: string;
      customer_name: string;
      customer_phone: string | null;
      total_amount: string;
      payment_method: Order['paymentMethod'];
      status: OrderStatus;
      status_at: Date;
      item_count: string;
      total_quantity: string;
    };

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
        pendingStatus: OrderStatus.PENDING_PAYMENT,
        newStatus: OrderStatus.NEW,
        doneStatus: OrderStatus.DONE,
        cancelledStatus: OrderStatus.CANCELLED,
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
      .getRawMany<RawCalendarOrder>();

    return {
      date,
      timezone: businessTimeZone,

      // null nghĩa là đang lấy tất cả status.
      status: status ?? null,

      // Nếu có status thì đây là tổng của status đó.
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

  async updateInfo(id: string, dto: UpdateOrderInfoDto) {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    /*
     * Chỉ cho sửa thông tin nhận hàng khi
     * order chưa kết thúc.
     */
    const canUpdate =
      order.status === OrderStatus.PENDING_PAYMENT ||
      order.status === OrderStatus.NEW;

    if (!canUpdate) {
      throw new BadRequestException(
        `Order information cannot be updated when status is ${order.status}`,
      );
    }

    /*
     * Nếu đơn pending đã hết hạn nhưng scheduled
     * job chưa kịp chạy thì hủy ngay tại đây.
     */
    const now = DateTime.utc();

    if (
      order.status === OrderStatus.PENDING_PAYMENT &&
      order.expiresAt &&
      order.expiresAt.getTime() <= now.toMillis()
    ) {
      order.status = OrderStatus.CANCELLED;

      await this.orderRepository.save(order);

      throw new BadRequestException('The order payment time has expired');
    }

    /*
     * Phân biệt body rỗng với các field được
     * truyền null để xóa.
     */
    const hasUpdates =
      dto.customerName !== undefined ||
      dto.customerEmail !== undefined ||
      dto.customerPhone !== undefined ||
      dto.shippingAddress !== undefined ||
      dto.note !== undefined;

    if (!hasUpdates) {
      throw new BadRequestException('At least one field must be provided');
    }

    if (dto.customerName !== undefined) {
      const customerName = dto.customerName.trim();

      if (!customerName) {
        throw new BadRequestException('Customer name cannot be empty');
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
        throw new BadRequestException('Shipping address cannot be empty');
      }

      order.shippingAddress = shippingAddress;
    }

    if (dto.note !== undefined) {
      if (dto.note === null) {
        order.note = null;
      } else {
        const note = dto.note.trim();

        /*
         * Chuỗi rỗng hoặc chỉ có khoảng trắng
         * cũng được xem là xóa note.
         */
        order.note = note || null;
      }
    }

    const savedOrder = await this.orderRepository.save(order);

    return this.findOne(savedOrder.id);
  }

  async updateItems(id: string, dto: UpdateOrderItemsDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Order must contain at least one product');
    }

    const uniqueProductIds = new Set(dto.items.map((item) => item.productId));

    if (uniqueProductIds.size !== dto.items.length) {
      throw new BadRequestException('Duplicate products are not allowed');
    }

    const productIds = [...uniqueProductIds];

    const result = await this.dataSource.transaction(async (manager) => {
      const orderRepository = manager.withRepository(this.orderRepository);

      const orderItemRepository = manager.withRepository(
        this.orderItemRepository,
      );

      const productRepository = manager.withRepository(this.productRepository);

      /*
       * Khóa order để hai admin không sửa items
       * cùng lúc.
       */
      const order = await orderRepository.findOne({
        where: { id },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new BadRequestException(
          'Items can only be updated for pending payment orders',
        );
      }

      /*
       * Nếu đơn đã hết hạn, lưu CANCELLED trước.
       * Trả kết quả ra ngoài transaction rồi mới
       * throw để việc cập nhật không bị rollback.
       */
      if (
        order.expiresAt &&
        order.expiresAt.getTime() <= DateTime.utc().toMillis()
      ) {
        order.status = OrderStatus.CANCELLED;

        await orderRepository.save(order);

        return {
          expired: true as const,
        };
      }

      const products = await productRepository.find({
        where: {
          id: In(productIds),
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
        throw new BadRequestException('One or more products are not available');
      }

      const productMap = new Map(
        products.map((product) => [product.id, product]),
      );

      const resolvedItems = dto.items.map((item) => {
        const product = productMap.get(item.productId);

        if (!product) {
          throw new BadRequestException(
            `Product ${item.productId} is not available`,
          );
        }

        let unitPrice: Decimal;

        try {
          unitPrice = new Decimal(product.salePrice ?? product.price);
        } catch {
          throw new BadRequestException(
            `Product ${product.id} has an invalid price`,
          );
        }

        if (!unitPrice.isFinite() || unitPrice.isNegative()) {
          throw new BadRequestException(
            `Product ${product.id} has an invalid price`,
          );
        }

        const totalPrice = unitPrice.mul(item.quantity);

        return {
          product,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
        };
      });

      const subtotal = resolvedItems.reduce(
        (total, item) => total.plus(item.totalPrice),
        new Decimal(0),
      );

      let shippingFee: Decimal;

      try {
        shippingFee = new Decimal(order.shippingFee ?? '0');
      } catch {
        throw new BadRequestException('Order has an invalid shipping fee');
      }

      if (!shippingFee.isFinite() || shippingFee.isNegative()) {
        throw new BadRequestException('Order has an invalid shipping fee');
      }

      const totalAmount = subtotal.plus(shippingFee);

      /*
       * Xóa items cũ và tạo lại toàn bộ trong
       * cùng transaction.
       */
      await orderItemRepository.delete({
        orderId: order.id,
      });

      const newOrderItems = resolvedItems.map(
        ({ product, quantity, unitPrice, totalPrice }) =>
          orderItemRepository.create({
            orderId: order.id,
            productId: product.id,
            productCode: product.productCode,
            productName: product.name,
            productThumbnailUrl: product.thumbnailUrl,
            quantity,
            unitPrice: unitPrice.toFixed(2),
            totalPrice: totalPrice.toFixed(2),
          }),
      );

      await orderItemRepository.save(newOrderItems);

      order.subtotal = subtotal.toFixed(2);

      order.totalAmount = totalAmount.toFixed(2);

      await orderRepository.save(order);

      return {
        expired: false as const,
        orderId: order.id,
      };
    });

    if (result.expired) {
      throw new BadRequestException('The order payment time has expired');
    }

    return this.findOne(result.orderId);
  }

  async updatePaymentProof(id: string, dto: UpdateOrderPaymentProofDto) {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        'Payment proof can only be submitted for pending payment orders',
      );
    }

    const submittedAt = DateTime.utc().toJSDate();

    if (order.expiresAt && order.expiresAt.getTime() <= submittedAt.getTime()) {
      order.status = OrderStatus.CANCELLED;

      await this.orderRepository.save(order);

      throw new BadRequestException('The payment submission time has expired');
    }

    order.paymentProofUrl = dto.paymentProofUrl;
    order.submittedAt = submittedAt;
    order.status = OrderStatus.NEW;

    const savedOrder = await this.orderRepository.save(order);

    return this.findOne(savedOrder.id);
  }

  async updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto) {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const previousStatus = order.status;
    const newStatus = updateOrderStatusDto.status;

    // Request lặp lại cùng status thì không cập nhật updatedAt.
    if (previousStatus === newStatus) {
      return this.findOne(order.id);
    }

    const allowedStatuses = this.allowedStatusTransitions[previousStatus] ?? [];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot change order status from ${previousStatus} to ${newStatus}`,
      );
    }

    order.status = newStatus;

    if (newStatus === OrderStatus.DONE) {
      order.doneAt = DateTime.utc().toJSDate();
    }

    const savedOrder = await this.orderRepository.save(order);

    return this.findOne(savedOrder.id);
  }

  private async generateOrderCode(
    orderRepository: Repository<Order>,
  ): Promise<string> {
    const characters = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const codeLength = 8;
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let code = '';

      for (let index = 0; index < codeLength; index++) {
        code += characters[randomInt(characters.length)];
      }

      const orderCode = `ORD-${code}`;

      const isExisting = await orderRepository.exists({
        where: { orderCode },
      });

      if (!isExisting) {
        return orderCode;
      }
    }

    throw new InternalServerErrorException(
      'Unable to generate a unique order code',
    );
  }

  private toOrderResponse(order: Order) {
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

      // Giữ nguyên decimal string.
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

        // Giữ nguyên decimal string.
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    };
  }

  private normalizePhone(phone: string) {
    const normalizedPhone = phone.replace(/\D/g, '');

    if (!/^\d{7,15}$/.test(normalizedPhone)) {
      throw new BadRequestException(
        'Phone number must contain between 7 and 15 digits',
      );
    }

    return normalizedPhone;
  }
}
