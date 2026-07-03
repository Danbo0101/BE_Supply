import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethod } from '../enums/payment-method.enum';

@Entity('payment_settings')
export class PaymentSetting {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    unique: true,
  })
  method!: PaymentMethod;

  @Column({ name: 'display_name', length: 100 })
  displayName!: string;

  @Column({ name: 'account_name', length: 150, nullable: true })
  accountName?: string;

  @Column({ name: 'account_value', length: 150, nullable: true })
  accountValue?: string;

  @Column({ name: 'qr_image_url', type: 'text' })
  qrImageUrl!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
