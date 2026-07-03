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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const category_entity_1 = require("../categories/entities/category.entity");
const product_entity_1 = require("./entities/product.entity");
let ProductsService = class ProductsService {
    productRepository;
    categoryRepository;
    constructor(productRepository, categoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }
    async createForCategory(categoryId, createProductDto) {
        const category = await this.categoryRepository.findOne({
            where: {
                id: categoryId,
                isActive: true,
            },
        });
        if (!category) {
            throw new common_1.NotFoundException('Category not found');
        }
        const slug = this.createSlug(createProductDto.name);
        const existingSlug = await this.productRepository.findOne({
            where: { slug },
        });
        if (existingSlug) {
            throw new common_1.ConflictException('Product name already exists');
        }
        const productCode = await this.generateProductCode(createProductDto.name);
        const product = this.productRepository.create({
            categoryId,
            productCode,
            name: createProductDto.name,
            slug,
            description: createProductDto.description,
            price: createProductDto.price.toFixed(2),
            salePrice: createProductDto.salePrice !== undefined
                ? createProductDto.salePrice.toFixed(2)
                : undefined,
            thumbnailUrl: createProductDto.thumbnailUrl,
            isFeatured: createProductDto.isFeatured ?? false,
            isActive: true,
        });
        const savedProduct = await this.productRepository.save(product);
        const productWithCategory = await this.productRepository.findOne({
            where: { id: savedProduct.id },
            relations: {
                category: true,
            },
        });
        if (!productWithCategory) {
            throw new common_1.NotFoundException('Product not found');
        }
        return this.toProductResponse(productWithCategory);
    }
    async findAllByCategory(categoryId) {
        const category = await this.categoryRepository.findOne({
            where: {
                id: categoryId,
                isActive: true,
            },
        });
        if (!category) {
            throw new common_1.NotFoundException('Category not found');
        }
        const products = await this.productRepository.find({
            where: {
                categoryId,
                isActive: true,
            },
            relations: {
                category: true,
            },
            order: {
                isFeatured: 'DESC',
                createdAt: 'DESC',
            },
        });
        return products.map((product) => this.toProductResponse(product));
    }
    async findOne(id) {
        const product = await this.productRepository.findOne({
            where: {
                id,
                isActive: true,
                category: {
                    isActive: true,
                },
            },
            relations: {
                category: true,
            },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return this.toProductResponse(product);
    }
    async update(id, updateProductDto) {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: {
                category: true,
            },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        if (updateProductDto.name) {
            const slug = this.createSlug(updateProductDto.name);
            const existingSlug = await this.productRepository.findOne({
                where: {
                    slug,
                    id: (0, typeorm_2.Not)(id),
                },
            });
            if (existingSlug) {
                throw new common_1.ConflictException('Product name already exists');
            }
            product.name = updateProductDto.name;
            product.slug = slug;
        }
        if (updateProductDto.description !== undefined) {
            product.description = updateProductDto.description;
        }
        if (updateProductDto.price !== undefined) {
            product.price = updateProductDto.price.toFixed(2);
        }
        if (updateProductDto.salePrice !== undefined) {
            product.salePrice = updateProductDto.salePrice.toFixed(2);
        }
        if (updateProductDto.thumbnailUrl !== undefined) {
            product.thumbnailUrl = updateProductDto.thumbnailUrl;
        }
        if (updateProductDto.isFeatured !== undefined) {
            product.isFeatured = updateProductDto.isFeatured;
        }
        const savedProduct = await this.productRepository.save(product);
        return this.toProductResponse(savedProduct);
    }
    async updateCategory(id, updateProductCategoryDto) {
        const product = await this.productRepository.findOne({
            where: { id },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        const category = await this.categoryRepository.findOne({
            where: {
                id: updateProductCategoryDto.categoryId,
                isActive: true,
            },
        });
        if (!category) {
            throw new common_1.NotFoundException('Category not found');
        }
        product.categoryId = updateProductCategoryDto.categoryId;
        const savedProduct = await this.productRepository.save(product);
        const productWithCategory = await this.productRepository.findOne({
            where: { id: savedProduct.id },
            relations: {
                category: true,
            },
        });
        if (!productWithCategory) {
            throw new common_1.NotFoundException('Product not found');
        }
        return this.toProductResponse(productWithCategory);
    }
    async updateStatus(id, updateProductStatusDto) {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: {
                category: true,
            },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        product.isActive = updateProductStatusDto.isActive;
        const savedProduct = await this.productRepository.save(product);
        return this.toProductResponse(savedProduct);
    }
    async generateProductCode(name) {
        const firstWord = name.trim().split(/\s+/)[0] ?? 'PRODUCT';
        const prefix = firstWord.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const safePrefix = prefix || 'PRODUCT';
        const latestProduct = await this.productRepository
            .createQueryBuilder('product')
            .where('product.productCode LIKE :pattern', {
            pattern: `${safePrefix}-%`,
        })
            .orderBy('product.productCode', 'DESC')
            .getOne();
        const latestNumber = latestProduct?.productCode
            ? Number(latestProduct.productCode.split('-')[1])
            : 0;
        const nextNumber = latestNumber + 1;
        return `${safePrefix}-${String(nextNumber).padStart(3, '0')}`;
    }
    createSlug(value) {
        return value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }
    toProductResponse(product) {
        return {
            id: product.id,
            categoryId: product.categoryId,
            productCode: product.productCode,
            name: product.name,
            slug: product.slug,
            description: product.description,
            price: Number(product.price),
            salePrice: product.salePrice !== undefined && product.salePrice !== null
                ? Number(product.salePrice)
                : null,
            thumbnailUrl: product.thumbnailUrl,
            isActive: product.isActive,
            isFeatured: product.isFeatured,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            category: product.category
                ? {
                    name: product.category.name,
                    slug: product.category.slug,
                    description: product.category.description,
                    imageUrl: product.category.imageUrl,
                }
                : null,
        };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(category_entity_1.Category)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ProductsService);
//# sourceMappingURL=products.service.js.map