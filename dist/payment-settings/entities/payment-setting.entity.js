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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentSetting = void 0;
const typeorm_1 = require("typeorm");
const payment_method_enum_1 = require("../enums/payment-method.enum");
let PaymentSetting = class PaymentSetting {
    id;
    method;
    displayName;
    accountName;
    accountValue;
    qrImageUrl;
    isActive;
    createdAt;
    updatedAt;
};
exports.PaymentSetting = PaymentSetting;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentSetting.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: payment_method_enum_1.PaymentMethod,
        unique: true,
    }),
    __metadata("design:type", String)
], PaymentSetting.prototype, "method", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_name', length: 100 }),
    __metadata("design:type", String)
], PaymentSetting.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'account_name', length: 150, nullable: true }),
    __metadata("design:type", String)
], PaymentSetting.prototype, "accountName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'account_value', length: 150, nullable: true }),
    __metadata("design:type", String)
], PaymentSetting.prototype, "accountValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'qr_image_url', type: 'text' }),
    __metadata("design:type", String)
], PaymentSetting.prototype, "qrImageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], PaymentSetting.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PaymentSetting.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], PaymentSetting.prototype, "updatedAt", void 0);
exports.PaymentSetting = PaymentSetting = __decorate([
    (0, typeorm_1.Entity)('payment_settings')
], PaymentSetting);
//# sourceMappingURL=payment-setting.entity.js.map