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
const subcategory_entity_1 = require("../subcategories/entities/subcategory.entity");
const product_entity_1 = require("./entities/product.entity");
let ProductsService = class ProductsService {
    productRepository;
    subcategoryRepository;
    constructor(productRepository, subcategoryRepository) {
        this.productRepository = productRepository;
        this.subcategoryRepository = subcategoryRepository;
    }
    async createForSubcategory(subcategoryId, createProductDto) {
        const subcategory = await this.findActiveSubcategory(subcategoryId);
        this.validateSalePrice(createProductDto.price, createProductDto.salePrice);
        const slug = this.createSlug(createProductDto.name);
        const existingSlug = await this.productRepository.findOne({
            where: { slug },
        });
        if (existingSlug) {
            throw new common_1.ConflictException('Product name already exists');
        }
        const productCode = await this.generateProductCode(createProductDto.name);
        const product = this.productRepository.create({
            subcategoryId: subcategory.id,
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
        return this.findOne(savedProduct.id);
    }
    async findAllBySubcategory(subcategoryId, sort = 'featured', minPrice, maxPrice) {
        await this.findActiveSubcategory(subcategoryId);
        const queryBuilder = this.productRepository
            .createQueryBuilder('product')
            .innerJoinAndSelect('product.subcategory', 'subcategory')
            .innerJoinAndSelect('subcategory.category', 'category')
            .where('product.subcategoryId = :subcategoryId', { subcategoryId })
            .andWhere('product.isActive = true')
            .andWhere('subcategory.isActive = true')
            .andWhere('category.isActive = true');
        const parsedMinPrice = minPrice !== undefined && minPrice !== '' ? Number(minPrice) : undefined;
        const parsedMaxPrice = maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : undefined;
        if (parsedMinPrice !== undefined &&
            (Number.isNaN(parsedMinPrice) || parsedMinPrice < 0)) {
            throw new common_1.BadRequestException('minPrice must be a valid number');
        }
        if (parsedMaxPrice !== undefined &&
            (Number.isNaN(parsedMaxPrice) || parsedMaxPrice < 0)) {
            throw new common_1.BadRequestException('maxPrice must be a valid number');
        }
        if (parsedMinPrice !== undefined &&
            parsedMaxPrice !== undefined &&
            parsedMinPrice > parsedMaxPrice) {
            throw new common_1.BadRequestException('minPrice must be less than or equal to maxPrice');
        }
        if (parsedMinPrice !== undefined) {
            queryBuilder.andWhere('COALESCE(product.salePrice, product.price) >= :minPrice', { minPrice: parsedMinPrice });
        }
        if (parsedMaxPrice !== undefined) {
            queryBuilder.andWhere('COALESCE(product.salePrice, product.price) <= :maxPrice', { maxPrice: parsedMaxPrice });
        }
        switch (sort) {
            case 'price_asc':
                queryBuilder.orderBy('COALESCE(product.salePrice, product.price)', 'ASC');
                break;
            case 'price_desc':
                queryBuilder.orderBy('COALESCE(product.salePrice, product.price)', 'DESC');
                break;
            case 'name_asc':
                queryBuilder.orderBy('product.name', 'ASC');
                break;
            case 'name_desc':
                queryBuilder.orderBy('product.name', 'DESC');
                break;
            case 'newest':
                queryBuilder.orderBy('product.createdAt', 'DESC');
                break;
            case 'featured':
            default:
                queryBuilder
                    .orderBy('product.isFeatured', 'DESC')
                    .addOrderBy('product.createdAt', 'DESC');
                break;
        }
        const products = await queryBuilder.getMany();
        return products.map((product) => this.toProductResponse(product));
    }
    async findOne(id) {
        const product = await this.productRepository.findOne({
            where: {
                id,
                isActive: true,
                subcategory: {
                    isActive: true,
                    category: {
                        isActive: true,
                    },
                },
            },
            relations: {
                subcategory: {
                    category: true,
                },
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
                subcategory: {
                    category: true,
                },
            },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        const nextPrice = updateProductDto.price !== undefined
            ? updateProductDto.price
            : Number(product.price);
        const nextSalePrice = updateProductDto.salePrice !== undefined
            ? updateProductDto.salePrice
            : product.salePrice !== undefined && product.salePrice !== null
                ? Number(product.salePrice)
                : undefined;
        this.validateSalePrice(nextPrice, nextSalePrice);
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
        return this.findOne(savedProduct.id);
    }
    async updateSubcategory(id, updateProductSubcategoryDto) {
        const product = await this.productRepository.findOne({
            where: { id },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        const subcategory = await this.findActiveSubcategory(updateProductSubcategoryDto.subcategoryId);
        product.subcategoryId = subcategory.id;
        const savedProduct = await this.productRepository.save(product);
        return this.findOne(savedProduct.id);
    }
    async updateStatus(id, updateProductStatusDto) {
        const product = await this.productRepository.findOne({
            where: { id },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        product.isActive = updateProductStatusDto.isActive;
        const savedProduct = await this.productRepository.save(product);
        return this.findOne(savedProduct.id);
    }
    async findActiveSubcategory(id) {
        const subcategory = await this.subcategoryRepository.findOne({
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
        if (!subcategory) {
            throw new common_1.NotFoundException('Subcategory not found');
        }
        return subcategory;
    }
    validateSalePrice(price, salePrice) {
        if (salePrice !== undefined && salePrice > price) {
            throw new common_1.BadRequestException('Sale price must be less than or equal to price');
        }
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
            subcategoryId: product.subcategoryId,
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
            subcategory: product.subcategory
                ? {
                    id: product.subcategory.id,
                    name: product.subcategory.name,
                    slug: product.subcategory.slug,
                    category: product.subcategory.category
                        ? {
                            id: product.subcategory.category.id,
                            name: product.subcategory.category.name,
                            slug: product.subcategory.category.slug,
                        }
                        : null,
                }
                : null,
        };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(subcategory_entity_1.Subcategory)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ProductsService);
//# sourceMappingURL=products.service.js.map