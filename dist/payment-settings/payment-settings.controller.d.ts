import { UpdatePaymentSettingDto } from './dto/update-payment-setting.dto';
import { CreatePaymentSettingDto } from './dto/create-payment-setting.dto';
import { PaymentSettingsService } from './payment-settings.service';
import { UpdatePaymentSettingStatusDto } from './dto/update-payment-setting-status.dto';
export declare class PaymentSettingsController {
    private readonly paymentSettingsService;
    constructor(paymentSettingsService: PaymentSettingsService);
    create(createPaymentSettingDto: CreatePaymentSettingDto): Promise<import("./entities/payment-setting.entity").PaymentSetting>;
    findAll(): Promise<import("./entities/payment-setting.entity").PaymentSetting[]>;
    findOne(id: string): Promise<import("./entities/payment-setting.entity").PaymentSetting>;
    update(id: string, updatePaymentSettingDto: UpdatePaymentSettingDto): Promise<import("./entities/payment-setting.entity").PaymentSetting>;
    updateStatus(id: string, updatePaymentSettingStatusDto: UpdatePaymentSettingStatusDto): Promise<import("./entities/payment-setting.entity").PaymentSetting>;
}
