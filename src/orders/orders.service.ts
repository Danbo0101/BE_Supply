import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CustomersService } from '../customers/customers.service';
import { PaymentSetting } from '../payment-settings/entities/payment-setting.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { UpdateOrderPaymentProofDto } from './dto/update-order-payment-proof.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

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
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const paymentSetting = await this.paymentSettingRepository.findOne({
      where: {
        method: createOrderDto.paymentMethod,
        isActive: true,
      },
    });

    if (!paymentSetting) {
      throw new BadRequestException('Payment method is not available');
    }

    const uniqueProductIds = new Set(
      createOrderDto.items.map((item) => item.productId),
    );

    if (uniqueProductIds.size !== createOrderDto.items.length) {
      throw new BadRequestException('Duplicate products are not allowed');
    }

    const productIds = [...uniqueProductIds];

    const customer = await this.customersService.findOrCreate({
      fullName: createOrderDto.customer.fullName,
      email: createOrderDto.customer.email,
      phone: createOrderDto.customer.phone,
      defaultAddress:
        createOrderDto.customer.defaultAddress ??
        createOrderDto.shippingAddress,
    });

    const normalizedPhone = this.normalizePhone(customer.phone);

    const products = await this.productRepository.find({
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
      customerPhone: normalizedPhone,
      shippingAddress: createOrderDto.shippingAddress,
      note: createOrderDto.note,
      subtotal: subtotal.toFixed(2),
      shippingFee: shippingFee.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      paymentMethod: createOrderDto.paymentMethod,
      paymentReference: createOrderDto.paymentReference ?? orderCode,
      paymentProofUrl: createOrderDto.paymentProofUrl,
      status: OrderStatus.PENDING_PAYMENT,
      submittedAt: new Date(),
    });

    const savedOrder = await this.orderRepository.save(order);

    const orderItems = createOrderDto.items.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new NotFoundException('Product not found');
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
  async lookup(orderCode: string, phone: string) {
    const normalizedPhone = this.normalizePhone(phone);

    const order = await this.orderRepository.findOne({
      where: {
        orderCode,
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

  async updatePaymentProof(
    id: string,
    updateOrderPaymentProofDto: UpdateOrderPaymentProofDto,
  ) {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.paymentProofUrl = updateOrderPaymentProofDto.paymentProofUrl;

    if (updateOrderPaymentProofDto.paymentReference !== undefined) {
      order.paymentReference = updateOrderPaymentProofDto.paymentReference;
    }

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

    order.status = updateOrderStatusDto.status;

    if (updateOrderStatusDto.status === OrderStatus.DONE) {
      order.doneAt = new Date();
    }

    if (updateOrderStatusDto.status !== OrderStatus.DONE) {
      order.doneAt = undefined;
    }

    const savedOrder = await this.orderRepository.save(order);

    return this.findOne(savedOrder.id);
  }

  private async generateOrderCode() {
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

  private normalizePhone(phone?: string) {
    if (!phone) {
      return phone;
    }

    return phone.replace(/\D/g, '');
  }
}
