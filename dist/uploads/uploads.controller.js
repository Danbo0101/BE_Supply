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
exports.UploadsController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const platform_express_1 = require("@nestjs/platform-express");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const multer_1 = require("multer");
const path_1 = require("path");
const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
if (!(0, fs_1.existsSync)(uploadDir)) {
    (0, fs_1.mkdirSync)(uploadDir, { recursive: true });
}
let UploadsController = class UploadsController {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    uploadImage(file) {
        if (!file) {
            throw new common_1.BadRequestException('Image file is required');
        }
        const appUrl = this.configService.get('APP_URL') ?? 'http://localhost:3000';
        const publicPath = this.configService.get('UPLOAD_PUBLIC_PATH') ?? '/uploads';
        return {
            url: `${appUrl}${publicPath}/${file.filename}`,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
        };
    }
};
exports.UploadsController = UploadsController;
__decorate([
    (0, common_1.Post)('image'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: uploadDir,
            filename: (req, file, callback) => {
                const fileExt = (0, path_1.extname)(file.originalname).toLowerCase();
                const fileName = `${Date.now()}-${(0, crypto_1.randomUUID)()}${fileExt}`;
                callback(null, fileName);
            },
        }),
        fileFilter: (req, file, callback) => {
            const isImage = /^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype);
            if (!isImage) {
                return callback(new common_1.BadRequestException('Only image files are allowed'), false);
            }
            callback(null, true);
        },
        limits: {
            fileSize: 5 * 1024 * 1024,
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UploadsController.prototype, "uploadImage", null);
exports.UploadsController = UploadsController = __decorate([
    (0, common_1.Controller)('uploads'),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UploadsController);
//# sourceMappingURL=uploads.controller.js.map