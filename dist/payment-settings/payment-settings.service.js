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
exports.PaymentSettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_setting_entity_1 = require("./entities/payment-setting.entity");
let PaymentSettingsService = class PaymentSettingsService {
    paymentSettingRepository;
    constructor(paymentSettingRepository) {
        this.paymentSettingRepository = paymentSettingRepository;
    }
    async create(createPaymentSettingDto) {
        const existingPaymentSetting = await this.paymentSettingRepository.findOne({
            where: {
                method: createPaymentSettingDto.method,
            },
        });
        if (existingPaymentSetting) {
            throw new common_1.ConflictException('Payment method already exists');
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
    async findOne(id) {
        const paymentSetting = await this.paymentSettingRepository.findOne({
            where: {
                id,
                isActive: true,
            },
        });
        if (!paymentSetting) {
            throw new common_1.NotFoundException('Payment setting not found');
        }
        return paymentSetting;
    }
    async update(id, updatePaymentSettingDto) {
        const paymentSetting = await this.paymentSettingRepository.findOne({
            where: { id },
        });
        if (!paymentSetting) {
            throw new common_1.NotFoundException('Payment setting not found');
        }
        if (updatePaymentSettingDto.method !== undefined) {
            const existingPaymentSetting = await this.paymentSettingRepository.findOne({
                where: {
                    method: updatePaymentSettingDto.method,
                    id: (0, typeorm_2.Not)(id),
                },
            });
            if (existingPaymentSetting) {
                throw new common_1.ConflictException('Payment method already exists');
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
    async updateStatus(id, updatePaymentSettingStatusDto) {
        const paymentSetting = await this.paymentSettingRepository.findOne({
            where: { id },
        });
        if (!paymentSetting) {
            throw new common_1.NotFoundException('Payment setting not found');
        }
        paymentSetting.isActive = updatePaymentSettingStatusDto.isActive;
        return this.paymentSettingRepository.save(paymentSetting);
    }
};
exports.PaymentSettingsService = PaymentSettingsService;
exports.PaymentSettingsService = PaymentSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_setting_entity_1.PaymentSetting)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PaymentSettingsService);
//# sourceMappingURL=payment-settings.service.js.map