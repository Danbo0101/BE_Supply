import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreatePaymentSettingDto } from './dto/create-payment-setting.dto';
import { PaymentSetting } from './entities/payment-setting.entity';
import { UpdatePaymentSettingDto } from './dto/update-payment-setting.dto';
import { UpdatePaymentSettingStatusDto } from './dto/update-payment-setting-status.dto';

@Injectable()
export class PaymentSettingsService {
  constructor(
    @InjectRepository(PaymentSetting)
    private readonly paymentSettingRepository: Repository<PaymentSetting>,
  ) {}

  async create(createPaymentSettingDto: CreatePaymentSettingDto) {
    const existingPaymentSetting = await this.paymentSettingRepository.findOne({
      where: {
        method: createPaymentSettingDto.method,
      },
    });

    if (existingPaymentSetting) {
      throw new ConflictException('Payment method already exists');
    }

    const paymentSetting = this.paymentSettingRepository.create({
      ...createPaymentSettingDto,
      isActive: createPaymentSettingDto.isActive ?? true,
    });

    return this.paymentSettingRepository.save(paymentSetting);
  }

  async findAll() {
    return this.paymentSettingRepository.find({
      where: {
        isActive: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async findOne(id: string) {
    const paymentSetting = await this.paymentSettingRepository.findOne({
      where: {
        id,
        isActive: true,
      },
    });

    if (!paymentSetting) {
      throw new NotFoundException('Payment setting not found');
    }

    return paymentSetting;
  }

  async update(id: string, updatePaymentSettingDto: UpdatePaymentSettingDto) {
    const paymentSetting = await this.paymentSettingRepository.findOne({
      where: { id },
    });

    if (!paymentSetting) {
      throw new NotFoundException('Payment setting not found');
    }

    if (updatePaymentSettingDto.method !== undefined) {
      const existingPaymentSetting =
        await this.paymentSettingRepository.findOne({
          where: {
            method: updatePaymentSettingDto.method,
            id: Not(id),
          },
        });

      if (existingPaymentSetting) {
        throw new ConflictException('Payment method already exists');
      }

      paymentSetting.method = updatePaymentSettingDto.method;
    }

    if (updatePaymentSettingDto.displayName !== undefined) {
      paymentSetting.displayName = updatePaymentSettingDto.displayName;
    }

    if (updatePaymentSettingDto.accountName !== undefined) {
      paymentSetting.accountName = updatePaymentSettingDto.accountName;
    }

    if (updatePaymentSettingDto.accountValue !== undefined) {
      paymentSetting.accountValue = updatePaymentSettingDto.accountValue;
    }

    if (updatePaymentSettingDto.qrImageUrl !== undefined) {
      paymentSetting.qrImageUrl = updatePaymentSettingDto.qrImageUrl;
    }

    return this.paymentSettingRepository.save(paymentSetting);
  }
  async updateStatus(
    id: string,
    updatePaymentSettingStatusDto: UpdatePaymentSettingStatusDto,
  ) {
    const paymentSetting = await this.paymentSettingRepository.findOne({
      where: { id },
    });

    if (!paymentSetting) {
      throw new NotFoundException('Payment setting not found');
    }

    paymentSetting.isActive = updatePaymentSettingStatusDto.isActive;

    return this.paymentSettingRepository.save(paymentSetting);
  }
}
