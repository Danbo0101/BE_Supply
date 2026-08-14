import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Subcategory } from '../subcategories/entities/subcategory.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductSubcategoryDto } from './dto/update-product-subcategory.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { randomUUID } from 'crypto';
import { SearchProductsDto } from './dto/search-products.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Subcategory)
    private readonly subcategoryRepository: Repository<Subcategory>,
  ) {}

  async searchForOrder(searchProductsDto: SearchProductsDto) {
    const { query, page, limit } = searchProductsDto;

    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      throw new BadRequestException(
        'Search query must contain at least 2 characters',
      );
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

    type RawSearchProduct = {
      id: string;
      product_code: string;
      name: string;
      thumbnail_url: string | null;
      price: string;
      sale_price: string | null;
      category_name: string;
      subcategory_name: string;
    };

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
      .getRawMany<RawSearchProduct>();

    return {
      query: normalizedQuery,
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),

      items: products.map((product) => {
        const originalPrice = Number(product.price);

        const salePrice =
          product.sale_price !== null ? Number(product.sale_price) : null;

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

  async createForSubcategory(
    subcategoryId: string,
    createProductDto: CreateProductDto,
  ) {
    const subcategory = await this.findActiveSubcategory(subcategoryId);

    this.validateSalePrice(createProductDto.price, createProductDto.salePrice);

    const name = createProductDto.name.trim();
    const slug = this.createSlug(name);

    // Chỉ kiểm tra trong cùng subcategory và product đang active
    const existingProduct = await this.productRepository.findOne({
      where: {
        subcategoryId: subcategory.id,
        slug,
        isActive: true,
      },
    });

    if (existingProduct) {
      throw new ConflictException(
        'Product name already exists in this subcategory',
      );
    }

    const productCode = this.generateProductCode();

    const product = this.productRepository.create({
      subcategoryId: subcategory.id,
      productCode,
      name,
      slug,
      description: createProductDto.description,
      price: createProductDto.price.toFixed(2),
      salePrice:
        createProductDto.salePrice !== undefined
          ? createProductDto.salePrice.toFixed(2)
          : undefined,
      thumbnailUrl: createProductDto.thumbnailUrl,
      isFeatured: createProductDto.isFeatured ?? false,
      isActive: true,
    });

    const savedProduct = await this.productRepository.save(product);

    return this.findOne(savedProduct.id);
  }

  async findAllBySubcategory(
    subcategoryId: string,
    sort = 'featured',
    minPrice?: string,
    maxPrice?: string,
  ) {
    await this.findActiveSubcategory(subcategoryId);

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.subcategory', 'subcategory')
      .innerJoinAndSelect('subcategory.category', 'category')
      .where('product.subcategoryId = :subcategoryId', { subcategoryId })
      .andWhere('product.isActive = true')
      .andWhere('subcategory.isActive = true')
      .andWhere('category.isActive = true');

    const parsedMinPrice =
      minPrice !== undefined && minPrice !== '' ? Number(minPrice) : undefined;

    const parsedMaxPrice =
      maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : undefined;

    if (
      parsedMinPrice !== undefined &&
      (Number.isNaN(parsedMinPrice) || parsedMinPrice < 0)
    ) {
      throw new BadRequestException('minPrice must be a valid number');
    }

    if (
      parsedMaxPrice !== undefined &&
      (Number.isNaN(parsedMaxPrice) || parsedMaxPrice < 0)
    ) {
      throw new BadRequestException('maxPrice must be a valid number');
    }

    if (
      parsedMinPrice !== undefined &&
      parsedMaxPrice !== undefined &&
      parsedMinPrice > parsedMaxPrice
    ) {
      throw new BadRequestException(
        'minPrice must be less than or equal to maxPrice',
      );
    }

    if (parsedMinPrice !== undefined) {
      queryBuilder.andWhere(
        'COALESCE(product.salePrice, product.price) >= :minPrice',
        { minPrice: parsedMinPrice },
      );
    }

    if (parsedMaxPrice !== undefined) {
      queryBuilder.andWhere(
        'COALESCE(product.salePrice, product.price) <= :maxPrice',
        { maxPrice: parsedMaxPrice },
      );
    }

    switch (sort) {
      case 'price_asc':
        queryBuilder.orderBy(
          'COALESCE(product.salePrice, product.price)',
          'ASC',
        );
        break;

      case 'price_desc':
        queryBuilder.orderBy(
          'COALESCE(product.salePrice, product.price)',
          'DESC',
        );
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

  async findOne(id: string) {
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
      throw new NotFoundException('Product not found');
    }

    return this.toProductResponse(product);
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: {
        subcategory: {
          category: true,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException('Inactive product cannot be updated');
    }

    if (!product.subcategory?.isActive) {
      throw new BadRequestException(
        'Cannot update product in an inactive subcategory',
      );
    }

    if (!product.subcategory.category?.isActive) {
      throw new BadRequestException(
        'Cannot update product in an inactive category',
      );
    }

    const nextPrice =
      updateProductDto.price !== undefined
        ? updateProductDto.price
        : Number(product.price);

    const nextSalePrice =
      updateProductDto.salePrice !== undefined
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
          id: Not(id),
        },
      });

      if (existingProduct) {
        throw new ConflictException(
          'Product name already exists in this subcategory',
        );
      }

      product.name = name;
      product.slug = slug;

      // Không đổi productCode khi đổi tên
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

  async updateSubcategory(
    id: string,
    updateProductSubcategoryDto: UpdateProductSubcategoryDto,
  ) {
    const product = await this.productRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException('Inactive product cannot be moved');
    }

    const { subcategoryId } = updateProductSubcategoryDto;

    if (product.subcategoryId === subcategoryId) {
      throw new BadRequestException(
        'Product already belongs to this subcategory',
      );
    }

    // Hàm này cần bảo đảm cả subcategory và category cha đang active
    const targetSubcategory = await this.findActiveSubcategory(subcategoryId);

    // Kiểm tra product trùng tên/slug trong subcategory đích
    const duplicateProduct = await this.productRepository.findOne({
      where: {
        subcategoryId: targetSubcategory.id,
        slug: product.slug,
        isActive: true,
        id: Not(product.id),
      },
    });

    if (duplicateProduct) {
      throw new ConflictException(
        `Product already exists in target subcategory`,
      );
    }

    product.subcategoryId = targetSubcategory.id;

    const savedProduct = await this.productRepository.save(product);

    return this.findOne(savedProduct.id);
  }

  async updateStatus(
    id: string,
    updateProductStatusDto: UpdateProductStatusDto,
  ) {
    const product = await this.productRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    product.isActive = updateProductStatusDto.isActive;

    return this.productRepository.save(product);
  }

  private async findActiveSubcategory(id: string) {
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

  private validateSalePrice(price: number, salePrice?: number) {
    if (salePrice !== undefined && salePrice > price) {
      throw new BadRequestException(
        'Sale price must be less than or equal to price',
      );
    }
  }

  private generateProductCode(): string {
    const randomSuffix = randomUUID()
      .replace(/-/g, '')
      .slice(0, 16)
      .toUpperCase();

    return `PRD-${randomSuffix}`;
  }

  private createSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private toProductResponse(product: Product) {
    return {
      id: product.id,
      subcategoryId: product.subcategoryId,
      productCode: product.productCode,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: Number(product.price),
      salePrice:
        product.salePrice !== undefined && product.salePrice !== null
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
            // description: product.subcategory.description,
            // imageUrl: product.subcategory.imageUrl,
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
}
