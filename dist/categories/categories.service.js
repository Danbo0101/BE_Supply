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
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const category_entity_1 = require("./entities/category.entity");
let CategoriesService = class CategoriesService {
    categoryRepository;
    constructor(categoryRepository) {
        this.categoryRepository = categoryRepository;
    }
    async create(createCategoryDto) {
        const slug = this.createSlug(createCategoryDto.name);
        const existingCategory = await this.categoryRepository.findOne({
            where: { slug },
        });
        if (existingCategory) {
            throw new common_1.ConflictException('Category name already exists');
        }
        const category = this.categoryRepository.create({
            ...createCategoryDto,
            slug,
        });
        return this.categoryRepository.save(category);
    }
    createSlug(value) {
        return value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }
    async findAll() {
        return this.categoryRepository.find({
            where: {
                isActive: true,
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
            where: { id },
        });
        if (!category) {
            throw new common_1.NotFoundException('Category not found');
        }
        if (updateCategoryDto.name) {
            const slug = this.createSlug(updateCategoryDto.name);
            const existingCategory = await this.categoryRepository.findOne({
                where: {
                    slug,
                    id: (0, typeorm_2.Not)(id),
                },
            });
            if (existingCategory) {
                throw new common_1.ConflictException('Category name already exists');
            }
            category.name = updateCategoryDto.name;
            category.slug = slug;
        }
        if (updateCategoryDto.description !== undefined) {
            category.description = updateCategoryDto.description;
        }
        if (updateCategoryDto.imageUrl !== undefined) {
            category.imageUrl = updateCategoryDto.imageUrl;
        }
        if (updateCategoryDto.displayOrder !== undefined) {
            category.displayOrder = updateCategoryDto.displayOrder;
        }
        return this.categoryRepository.save(category);
    }
    async updateStatus(id, updateCategoryStatusDto) {
        const category = await this.categoryRepository.findOne({
            where: { id },
        });
        if (!category) {
            throw new common_1.NotFoundException('Category not found');
        }
        category.isActive = updateCategoryStatusDto.isActive;
        return this.categoryRepository.save(category);
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(category_entity_1.Category)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map