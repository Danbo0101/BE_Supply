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
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const typeorm_3 = require("typeorm");
const category_entity_1 = require("./entities/category.entity");
const product_entity_1 = require("../products/entities/product.entity");
const subcategory_entity_1 = require("../subcategories/entities/subcategory.entity");
let CategoriesService = class CategoriesService {
    categoryRepository;
    dataSource;
    constructor(categoryRepository, dataSource) {
        this.categoryRepository = categoryRepository;
        this.dataSource = dataSource;
    }
    async create(createCategoryDto) {
        const slug = this.createSlug(createCategoryDto.name);
        const existingCategory = await this.categoryRepository.findOne({
            where: {
                slug,
                isActive: true,
            },
        });
        if (existingCategory) {
            throw new common_1.ConflictException('Category name already exists');
        }
        const result = await this.categoryRepository
            .createQueryBuilder('category')
            .select('COALESCE(MAX(category.displayOrder), 0)', 'maxDisplayOrder')
            .where('category.isActive = :isActive', {
            isActive: true,
        })
            .getRawOne();
        const displayOrder = Number(result?.maxDisplayOrder ?? 0) + 1;
        const category = this.categoryRepository.create({
            ...createCategoryDto,
            slug,
            displayOrder,
        });
        const savedCategory = await this.categoryRepository.save(category);
        console.log({
            databaseMaximum: result?.maxDisplayOrder,
            generatedDisplayOrder: displayOrder,
            savedDisplayOrder: savedCategory.displayOrder,
        });
        return savedCategory;
    }
    createSlug(value) {
        return value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }
    async findAll(query) {
        const searchValue = query?.trim();
        return this.categoryRepository.find({
            where: {
                isActive: true,
                ...(searchValue
                    ? {
                        name: (0, typeorm_3.ILike)(`%${searchValue}%`),
                    }
                    : {}),
            },
            order: {
                displayOrder: 'ASC',
                createdAt: 'DESC',
            },
        });
    }
    async findOne(id) {
        const category = await this.categoryRepository.findOne({
            where: {
                id,
                isActive: true,
            },
        });
        if (!category) {
            throw new common_1.NotFoundException('Category not found');
        }
        return category;
    }
    async update(id, updateCategoryDto) {
        const category = await this.categoryRepository.findOne({
            where: {
                id,
                isActive: true,
            },
        });
        if (!category) {
            throw new common_1.NotFoundException('Active category not found or category is inactive');
        }
        if (updateCategoryDto.name !== undefined) {
            const slug = this.createSlug(updateCategoryDto.name);
            const existingCategory = await this.categoryRepository.findOne({
                where: {
                    id: (0, typeorm_3.Not)(id),
                    slug,
                    isActive: true,
                },
            });
            if (existingCategory) {
                throw new common_1.ConflictException('Category name already exists in active categories');
            }
            category.name = updateCategoryDto.name;
            category.slug = slug;
        }
        if (updateCategoryDto.displayOrder !== undefined) {
            const existingDisplayOrder = await this.categoryRepository.findOne({
                where: {
                    id: (0, typeorm_3.Not)(id),
                    displayOrder: updateCategoryDto.displayOrder,
                    isActive: true,
                },
            });
            if (existingDisplayOrder) {
                throw new common_1.ConflictException('Display order already exists in active categories');
            }
            category.displayOrder = updateCategoryDto.displayOrder;
        }
        if (updateCategoryDto.description !== undefined) {
            category.description = updateCategoryDto.description;
        }
        if (updateCategoryDto.imageUrl !== undefined) {
            category.imageUrl = updateCategoryDto.imageUrl;
        }
        return this.categoryRepository.save(category);
    }
    async updateStatus(id, updateCategoryStatusDto) {
        return this.dataSource.transaction(async (manager) => {
            const categoryRepository = manager.getRepository(category_entity_1.Category);
            const subcategoryRepository = manager.getRepository(subcategory_entity_1.Subcategory);
            const productRepository = manager.getRepository(product_entity_1.Product);
            const category = await categoryRepository.findOne({
                where: { id },
            });
            if (!category) {
                throw new common_1.NotFoundException('Category not found');
            }
            const { isActive } = updateCategoryStatusDto;
            if (!isActive) {
                const subcategories = await subcategoryRepository.find({
                    where: {
                        category: { id },
                    },
                    select: {
                        id: true,
                    },
                });
                const subcategoryIds = subcategories.map((subcategory) => subcategory.id);
                if (subcategoryIds.length > 0) {
                    await productRepository.update({
                        subcategory: {
                            id: (0, typeorm_1.In)(subcategoryIds),
                        },
                    }, {
                        isActive: false,
                    });
                }
                await subcategoryRepository.update({
                    category: { id },
                }, {
                    isActive: false,
                });
            }
            category.isActive = isActive;
            return categoryRepository.save(category);
        });
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_2.InjectRepository)(category_entity_1.Category)),
    __metadata("design:paramtypes", [typeorm_3.Repository,
        typeorm_1.DataSource])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map