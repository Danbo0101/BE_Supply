import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { PaymentMethod } from '../../payment-settings/enums/payment-method.enum';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @Column({ name: 'order_code', length: 50, unique: true })
  orderCode!: string;

  @Column({ name: 'customer_name', length: 150 })
  customerName!: string;

  @Column({ name: 'customer_email', length: 150, nullable: true })
  customerEmail?: string;

  @Column({ name: 'customer_phone', length: 30, nullable: true })
  customerPhone?: string;

  @Column({ name: 'shipping_address', type: 'text' })
  shippingAddress!: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal!: string;

  @Column({
    name: 'shipping_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  shippingFee!: string;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalAmount!: string;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod!: PaymentMethod;

  @Column({ name: 'payment_reference', length: 255 })
  paymentReference!: string;

  @Column({ name: 'payment_proof_url', type: 'text', nullable: true })
  paymentProofUrl?: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING_PAYMENT,
  })
  status!: OrderStatus;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt?: Date;

  @Column({ name: 'done_at', type: 'timestamp', nullable: true })
  doneAt?: Date;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  items!: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
