import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryStatusDto } from './dto/update-subcategory-status.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { Subcategory } from './entities/subcategory.entity';

@Injectable()
export class SubcategoriesService {
  constructor(
    @InjectRepository(Subcategory)
    private readonly subcategoryRepository: Repository<Subcategory>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
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

    const slug = this.createSlug(createSubcategoryDto.name);

    const existingSlug = await this.subcategoryRepository.findOne({
      where: { slug },
    });

    if (existingSlug) {
      throw new ConflictException('Subcategory name already exists');
    }

    const existingNameInCategory = await this.subcategoryRepository.findOne({
      where: {
        categoryId,
        name: createSubcategoryDto.name,
      },
    });

    if (existingNameInCategory) {
      throw new ConflictException(
        'Subcategory already exists in this category',
      );
    }

    const subcategory = this.subcategoryRepository.create({
      categoryId,
      ...createSubcategoryDto,
      slug,
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

    return subcategory;
  }

  async update(id: string, updateSubcategoryDto: UpdateSubcategoryDto) {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id },
    });

    if (!subcategory) {
      throw new NotFoundException('Subcategory not found');
    }

    if (updateSubcategoryDto.name) {
      const slug = this.createSlug(updateSubcategoryDto.name);

      const existingSlug = await this.subcategoryRepository.findOne({
        where: {
          slug,
          id: Not(id),
        },
      });

      if (existingSlug) {
        throw new ConflictException('Subcategory name already exists');
      }

      const existingNameInCategory = await this.subcategoryRepository.findOne({
        where: {
          categoryId: subcategory.categoryId,
          name: updateSubcategoryDto.name,
          id: Not(id),
        },
      });

      if (existingNameInCategory) {
        throw new ConflictException(
          'Subcategory already exists in this category',
        );
      }

      subcategory.name = updateSubcategoryDto.name;
      subcategory.slug = slug;
    }

    if (updateSubcategoryDto.description !== undefined) {
      subcategory.description = updateSubcategoryDto.description;
    }

    if (updateSubcategoryDto.imageUrl !== undefined) {
      subcategory.imageUrl = updateSubcategoryDto.imageUrl;
    }

    if (updateSubcategoryDto.displayOrder !== undefined) {
      subcategory.displayOrder = updateSubcategoryDto.displayOrder;
    }

    if (updateSubcategoryDto.isActive !== undefined) {
      subcategory.isActive = updateSubcategoryDto.isActive;
    }

    return this.subcategoryRepository.save(subcategory);
  }

  async updateStatus(
    id: string,
    updateSubcategoryStatusDto: UpdateSubcategoryStatusDto,
  ) {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id },
    });

    if (!subcategory) {
      throw new NotFoundException('Subcategory not found');
    }

    subcategory.isActive = updateSubcategoryStatusDto.isActive;

    return this.subcategoryRepository.save(subcategory);
  }

  private createSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}
