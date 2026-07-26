import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from './entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { Subcategory } from '../subcategories/entities/subcategory.entity';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateCategoryStatusDto } from './dto/update-category-status.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const slug = this.createSlug(createCategoryDto.name);

    const existingCategory = await this.categoryRepository.findOne({
      where: { slug },
    });

    if (existingCategory) {
      throw new ConflictException('Category name already exists');
    }

    const result = await this.categoryRepository
      .createQueryBuilder('category')
      .select('COALESCE(MAX(category.displayOrder), 0)', 'maxDisplayOrder')
      .where('category.isActive = :isActive', {
        isActive: true,
      })
      .getRawOne<{ maxDisplayOrder: string | number }>();

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

  private createSlug(value: string) {
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

  async findOne(id: string) {
    const category = await this.categoryRepository.findOne({
      where: {
        id,
        isActive: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.categoryRepository.findOne({
      where: {
        id,
        isActive: true,
      },
    });

    if (!category) {
      throw new NotFoundException(
        'Active category not found or category is inactive',
      );
    }

    if (updateCategoryDto.name !== undefined) {
      const slug = this.createSlug(updateCategoryDto.name);

      const existingCategory = await this.categoryRepository.findOne({
        where: {
          id: Not(id),
          slug,
          isActive: true,
        },
      });

      if (existingCategory) {
        throw new ConflictException(
          'Category name already exists in active categories',
        );
      }

      category.name = updateCategoryDto.name;
      category.slug = slug;
    }

    if (updateCategoryDto.displayOrder !== undefined) {
      const existingDisplayOrder = await this.categoryRepository.findOne({
        where: {
          id: Not(id),
          displayOrder: updateCategoryDto.displayOrder,
          isActive: true,
        },
      });

      if (existingDisplayOrder) {
        throw new ConflictException(
          'Display order already exists in active categories',
        );
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

  async updateStatus(
    id: string,
    updateCategoryStatusDto: UpdateCategoryStatusDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const categoryRepository = manager.getRepository(Category);
      const subcategoryRepository = manager.getRepository(Subcategory);
      const productRepository = manager.getRepository(Product);

      const category = await categoryRepository.findOne({
        where: { id },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
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

        const subcategoryIds = subcategories.map(
          (subcategory) => subcategory.id,
        );

        if (subcategoryIds.length > 0) {
          await productRepository.update(
            {
              subcategory: {
                id: In(subcategoryIds),
              },
            },
            {
              isActive: false,
            },
          );
        }

        await subcategoryRepository.update(
          {
            category: { id },
          },
          {
            isActive: false,
          },
        );
      }

      category.isActive = isActive;

      return categoryRepository.save(category);
    });
  }
}
