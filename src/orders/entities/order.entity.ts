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
  @Column({
    name: 'order_code',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  orderCode!: string;

  @Column({ name: 'customer_name', length: 150 })
  customerName!: string;

  @Column({
    name: 'customer_email',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  customerEmail!: string | null;

  @Column({
    name: 'customer_phone',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  customerPhone!: string | null;

  @Column({ name: 'shipping_address', type: 'text' })
  shippingAddress!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  note!: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal!: string;

  @Column({
    name: 'shipping_fee',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: '0.00',
  })
  shippingFee!: string;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  totalAmount!: string;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod!: PaymentMethod;

  @Column({ name: 'payment_proof_url', type: 'text', nullable: true })
  paymentProofUrl?: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING_PAYMENT,
  })
  status!: OrderStatus;

  @Column({
    name: 'submitted_at',
    type: 'timestamptz',
    nullable: true,
  })
  submittedAt!: Date | null;

  @Column({
    name: 'done_at',
    type: 'timestamptz',
    nullable: true,
  })
  doneAt!: Date | null;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  items!: OrderItem[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt!: Date;

  @Column({
    name: 'expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  expiresAt!: Date | null;
}
