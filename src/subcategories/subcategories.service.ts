import {
  ConflictException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { Subcategory } from './entities/subcategory.entity';
import { Product } from '../products/entities/product.entity';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryStatusDto } from './dto/update-subcategory-status.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { MoveSubcategoryDto } from './dto/move-subcategory.dto';

@Injectable()
export class SubcategoriesService {
  constructor(
    @InjectRepository(Subcategory)
    private readonly subcategoryRepository: Repository<Subcategory>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    private readonly dataSource: DataSource,
  ) {}

  async createForCategory(
    categoryId: string,
    createSubcategoryDto: CreateSubcategoryDto,
  ) {
    const category = await this.categoryRepository.findOne({
      where: {
        id: categoryId,
        isActive: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const name = createSubcategoryDto.name.trim();
    const slug = this.createSlug(name);

    // Slug chỉ unique trong category và giữa các bản ghi đang active
    const existingSlugInCategory = await this.subcategoryRepository.findOne({
      where: {
        categoryId,
        slug,
        isActive: true,
      },
    });

    if (existingSlugInCategory) {
      throw new ConflictException(
        'Subcategory name already exists in this category',
      );
    }

    // Tìm displayOrder cuối cùng trong category
    const result = await this.subcategoryRepository
      .createQueryBuilder('subcategory')
      .select('MAX(subcategory.displayOrder)', 'maxDisplayOrder')
      .where('subcategory.categoryId = :categoryId', {
        categoryId,
      })
      .andWhere('subcategory.isActive = :isActive', {
        isActive: true,
      })
      .getRawOne<{ maxDisplayOrder: string | null }>();

    const displayOrder = Number(result?.maxDisplayOrder ?? 0) + 1;

    const subcategory = this.subcategoryRepository.create({
      ...createSubcategoryDto,
      name,
      categoryId,
      slug,
      displayOrder,
      isActive: createSubcategoryDto.isActive ?? true,
    });

    return this.subcategoryRepository.save(subcategory);
  }

  async findAllByCategory(categoryId: string) {
    const category = await this.categoryRepository.findOne({
      where: {
        id: categoryId,
        isActive: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.subcategoryRepository.find({
      where: {
        categoryId,
        isActive: true,
      },
      order: {
        displayOrder: 'ASC',
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string) {
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
      throw new NotFoundException('Subcategory not found');
    }

    return this.toSubcategoryResponse(subcategory);
  }

  async update(id: string, updateSubcategoryDto: UpdateSubcategoryDto) {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id },
    });

    if (!subcategory) {
      throw new NotFoundException('Subcategory not found');
    }

    // Vì isActive = false được xem là đã tắt vĩnh viễn
    if (!subcategory.isActive) {
      throw new BadRequestException('Inactive subcategory cannot be updated');
    }

    if (updateSubcategoryDto.name !== undefined) {
      const name = updateSubcategoryDto.name.trim();
      const slug = this.createSlug(name);

      // Chỉ kiểm tra slug trong cùng category
      const existingSlugInCategory = await this.subcategoryRepository.findOne({
        where: {
          categoryId: subcategory.categoryId,
          slug,
          isActive: true,
          id: Not(id),
        },
      });

      if (existingSlugInCategory) {
        throw new ConflictException(
          'Subcategory name already exists in this category',
        );
      }

      subcategory.name = name;
      subcategory.slug = slug;
    }

    if (updateSubcategoryDto.displayOrder !== undefined) {
      const existingDisplayOrder = await this.subcategoryRepository.findOne({
        where: {
          categoryId: subcategory.categoryId,
          displayOrder: updateSubcategoryDto.displayOrder,
          isActive: true,
          id: Not(id),
        },
      });

      if (existingDisplayOrder) {
        throw new ConflictException(
          `Display order ${updateSubcategoryDto.displayOrder} is already used in this category`,
        );
      }

      subcategory.displayOrder = updateSubcategoryDto.displayOrder;
    }

    if (updateSubcategoryDto.description !== undefined) {
      subcategory.description = updateSubcategoryDto.description;
    }

    if (updateSubcategoryDto.imageUrl !== undefined) {
      subcategory.imageUrl = updateSubcategoryDto.imageUrl;
    }

    return this.subcategoryRepository.save(subcategory);
  }

  async moveToCategory(
    subcategoryId: string,
    moveSubcategoryDto: MoveSubcategoryDto,
  ) {
    const { targetCategoryId } = moveSubcategoryDto;

    const subcategory = await this.subcategoryRepository.findOne({
      where: {
        id: subcategoryId,
      },
    });

    if (!subcategory) {
      throw new NotFoundException('Subcategory not found');
    }

    if (!subcategory.isActive) {
      throw new BadRequestException('Inactive subcategory cannot be moved');
    }

    if (subcategory.categoryId === targetCategoryId) {
      throw new BadRequestException(
        'Subcategory already belongs to this category',
      );
    }

    const targetCategory = await this.categoryRepository.findOne({
      where: {
        id: targetCategoryId,
      },
    });

    if (!targetCategory) {
      throw new NotFoundException('Target category not found');
    }

    if (!targetCategory.isActive) {
      throw new BadRequestException(
        'Cannot move subcategory to an inactive category',
      );
    }

    // Kiểm tra slug đang active trong category đích
    const duplicateSlug = await this.subcategoryRepository.findOne({
      where: {
        categoryId: targetCategoryId,
        slug: subcategory.slug,
        isActive: true,
        id: Not(subcategory.id),
      },
    });

    if (duplicateSlug) {
      throw new ConflictException(
        `Subcategory already exists in target category`,
      );
    }

    // Lấy displayOrder lớn nhất của subcategory active
    const maxDisplayOrder = await this.subcategoryRepository.maximum(
      'displayOrder',
      {
        categoryId: targetCategoryId,
        isActive: true,
      },
    );

    subcategory.categoryId = targetCategoryId;
    subcategory.category = targetCategory;
    subcategory.displayOrder = (maxDisplayOrder ?? 0) + 1;

    return this.subcategoryRepository.save(subcategory);
  }

  async updateStatus(
    id: string,
    updateSubcategoryStatusDto: UpdateSubcategoryStatusDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const subcategoryRepository = manager.getRepository(Subcategory);

      const productRepository = manager.getRepository(Product);

      const subcategory = await subcategoryRepository.findOne({
        where: { id },
      });

      if (!subcategory) {
        throw new NotFoundException('Subcategory not found');
      }

      const { isActive } = updateSubcategoryStatusDto;

      // Khi tắt subcategory, tắt toàn bộ product bên trong
      if (!isActive) {
        await productRepository.update(
          {
            subcategoryId: id,
          },
          {
            isActive: false,
          },
        );
      }

      // Khi bật lại chỉ bật subcategory, không bật product
      subcategory.isActive = isActive;

      return subcategoryRepository.save(subcategory);
    });
  }

  private createSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private toSubcategoryResponse(subcategory: Subcategory) {
    return {
      id: subcategory.id,
      categoryId: subcategory.categoryId,
      name: subcategory.name,
      slug: subcategory.slug,
      description: subcategory.description,
      imageUrl: subcategory.imageUrl,
      displayOrder: subcategory.displayOrder,
      isActive: subcategory.isActive,
      createdAt: subcategory.createdAt,
      updatedAt: subcategory.updatedAt,
      category: subcategory.category
        ? {
            id: subcategory.category.id,
            name: subcategory.category.name,
            slug: subcategory.category.slug,
          }
        : null,
    };
  }
}
