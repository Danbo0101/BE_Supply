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
exports.PaymentSettingsController = void 0;
const common_1 = require("@nestjs/common");
const update_payment_setting_dto_1 = require("./dto/update-payment-setting.dto");
const create_payment_setting_dto_1 = require("./dto/create-payment-setting.dto");
const payment_settings_service_1 = require("./payment-settings.service");
const update_payment_setting_status_dto_1 = require("./dto/update-payment-setting-status.dto");
let PaymentSettingsController = class PaymentSettingsController {
    paymentSettingsService;
    constructor(paymentSettingsService) {
        this.paymentSettingsService = paymentSettingsService;
    }
    create(createPaymentSettingDto) {
        return this.paymentSettingsService.create(createPaymentSettingDto);
    }
    findAll() {
        return this.paymentSettingsService.findAll();
    }
    findOne(id) {
        return this.paymentSettingsService.findOne(id);
    }
    update(id, updatePaymentSettingDto) {
        return this.paymentSettingsService.update(id, updatePaymentSettingDto);
    }
    updateStatus(id, updatePaymentSettingStatusDto) {
        return this.paymentSettingsService.updateStatus(id, updatePaymentSettingStatusDto);
    }
};
exports.PaymentSettingsController = PaymentSettingsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_payment_setting_dto_1.CreatePaymentSettingDto]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_payment_setting_dto_1.UpdatePaymentSettingDto]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/active'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_payment_setting_status_dto_1.UpdatePaymentSettingStatusDto]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "updateStatus", null);
exports.PaymentSettingsController = PaymentSettingsController = __decorate([
    (0, common_1.Controller)('payment-settings'),
    __metadata("design:paramtypes", [payment_settings_service_1.PaymentSettingsService])
], PaymentSettingsController);
//# sourceMappingURL=payment-settings.controller.js.map