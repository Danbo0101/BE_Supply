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
const crypto_1 = require("crypto");
let ProductsService = class ProductsService {
    productRepository;
    subcategoryRepository;
    constructor(productRepository, subcategoryRepository) {
        this.productRepository = productRepository;
        this.subcategoryRepository = subcategoryRepository;
    }
    async searchForOrder(searchProductsDto) {
        const { query, page, limit } = searchProductsDto;
        const normalizedQuery = query.trim();
        if (normalizedQuery.length < 2) {
            throw new common_1.BadRequestException('Search query must contain at least 2 characters');
        }
        const skip = (page - 1) * limit;
        const queryBuilder = this.productRepository
            .createQueryBuilder('product')
            .innerJoin('product.subcategory', 'subcategory')
            .innerJoin('subcategory.category', 'category')
            .where('product.name ILIKE :query', {
            query: `%${normalizedQuery}%`,
        })
            .andWhere('product.isActive = true')
            .andWhere('subcategory.isActive = true')
            .andWhere('category.isActive = true');
        const total = await queryBuilder.getCount();
        const products = await queryBuilder
            .clone()
            .select('product.id', 'id')
            .addSelect('product.productCode', 'product_code')
            .addSelect('product.name', 'name')
            .addSelect('product.thumbnailUrl', 'thumbnail_url')
            .addSelect('product.price', 'price')
            .addSelect('product.salePrice', 'sale_price')
            .addSelect('category.name', 'category_name')
            .addSelect('subcategory.name', 'subcategory_name')
            .orderBy('product.isFeatured', 'DESC')
            .addOrderBy('product.name', 'ASC')
            .offset(skip)
            .limit(limit)
            .getRawMany();
        return {
            query: normalizedQuery,
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            items: products.map((product) => {
                const originalPrice = Number(product.price);
                const salePrice = product.sale_price !== null ? Number(product.sale_price) : null;
                const hasDiscount = salePrice !== null && salePrice < originalPrice;
                return {
                    id: product.id,
                    productCode: product.product_code,
                    name: product.name,
                    thumbnailUrl: product.thumbnail_url,
                    displayPrice: (hasDiscount ? salePrice : originalPrice).toFixed(2),
                    originalPrice: originalPrice.toFixed(2),
                    hasDiscount,
                    isAvailable: true,
                    categoryName: product.category_name,
                    subcategoryName: product.subcategory_name,
                };
            }),
        };
    }
    async createForSubcategory(subcategoryId, createProductDto) {
        const subcategory = await this.findActiveSubcategory(subcategoryId);
        this.validateSalePrice(createProductDto.price, createProductDto.salePrice);
        const name = createProductDto.name.trim();
        const slug = this.createSlug(name);
        const existingProduct = await this.productRepository.findOne({
            where: {
                subcategoryId: subcategory.id,
                slug,
                isActive: true,
            },
        });
        if (existingProduct) {
            throw new common_1.ConflictException('Product name already exists in this subcategory');
        }
        const productCode = this.generateProductCode();
        const product = this.productRepository.create({
            subcategoryId: subcategory.id,
            productCode,
            name,
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
    async findAllBySubcategory(subcategoryId, sort = 'featured', minPrice, maxPrice, query) {
        await this.findActiveSubcategory(subcategoryId);
        const searchValue = query?.trim();
        const queryBuilder = this.productRepository
            .createQueryBuilder('product')
            .innerJoinAndSelect('product.subcategory', 'subcategory')
            .innerJoinAndSelect('subcategory.category', 'category')
            .where('product.subcategoryId = :subcategoryId', {
            subcategoryId,
        })
            .andWhere('product.isActive = true')
            .andWhere('subcategory.isActive = true')
            .andWhere('category.isActive = true');
        if (searchValue) {
            queryBuilder.andWhere('product.name ILIKE :keyword', {
                keyword: `%${searchValue}%`,
            });
        }
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
            queryBuilder.andWhere('COALESCE(product.salePrice, product.price) >= :minPrice', {
                minPrice: parsedMinPrice,
            });
        }
        if (parsedMaxPrice !== undefined) {
            queryBuilder.andWhere('COALESCE(product.salePrice, product.price) <= :maxPrice', {
                maxPrice: parsedMaxPrice,
            });
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
        if (!product.isActive) {
            throw new common_1.BadRequestException('Inactive product cannot be updated');
        }
        if (!product.subcategory?.isActive) {
            throw new common_1.BadRequestException('Cannot update product in an inactive subcategory');
        }
        if (!product.subcategory.category?.isActive) {
            throw new common_1.BadRequestException('Cannot update product in an inactive category');
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
        if (updateProductDto.name !== undefined) {
            const name = updateProductDto.name.trim();
            const slug = this.createSlug(name);
            const existingProduct = await this.productRepository.findOne({
                where: {
                    subcategoryId: product.subcategoryId,
                    slug,
                    isActive: true,
                    id: (0, typeorm_2.Not)(id),
                },
            });
            if (existingProduct) {
                throw new common_1.ConflictException('Product name already exists in this subcategory');
            }
            product.name = name;
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
        if (!product.isActive) {
            throw new common_1.BadRequestException('Inactive product cannot be moved');
        }
        const { subcategoryId } = updateProductSubcategoryDto;
        if (product.subcategoryId === subcategoryId) {
            throw new common_1.BadRequestException('Product already belongs to this subcategory');
        }
        const targetSubcategory = await this.findActiveSubcategory(subcategoryId);
        const duplicateProduct = await this.productRepository.findOne({
            where: {
                subcategoryId: targetSubcategory.id,
                slug: product.slug,
                isActive: true,
                id: (0, typeorm_2.Not)(product.id),
            },
        });
        if (duplicateProduct) {
            throw new common_1.ConflictException(`Product already exists in target subcategory`);
        }
        product.subcategoryId = targetSubcategory.id;
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
        return this.productRepository.save(product);
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
    generateProductCode() {
        const randomSuffix = (0, crypto_1.randomUUID)()
            .replace(/-/g, '')
            .slice(0, 16)
            .toUpperCase();
        return `PRD-${randomSuffix}`;
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