import { Repository } from 'typeorm';
import { CreatePaymentSettingDto } from './dto/create-payment-setting.dto';
import { PaymentSetting } from './entities/payment-setting.entity';
import { UpdatePaymentSettingDto } from './dto/update-payment-setting.dto';
import { UpdatePaymentSettingStatusDto } from './dto/update-payment-setting-status.dto';
export declare class PaymentSettingsService {
    private readonly paymentSettingRepository;
    constructor(paymentSettingRepository: Repository<PaymentSetting>);
    create(createPaymentSettingDto: CreatePaymentSettingDto): Promise<PaymentSetting>;
    findAll(): Promise<PaymentSetting[]>;
    findOne(id: string): Promise<PaymentSetting>;
    update(id: string, updatePaymentSettingDto: UpdatePaymentSettingDto): Promise<PaymentSetting>;
    updateStatus(id: string, updatePaymentSettingStatusDto: UpdatePaymentSettingStatusDto): Promise<PaymentSetting>;
}
