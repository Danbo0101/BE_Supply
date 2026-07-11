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

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Subcategory)
    private readonly subcategoryRepository: Repository<Subcategory>,
  ) {}

  async createForSubcategory(
    subcategoryId: string,
    createProductDto: CreateProductDto,
  ) {
    const subcategory = await this.findActiveSubcategory(subcategoryId);

    this.validateSalePrice(createProductDto.price, createProductDto.salePrice);

    const slug = this.createSlug(createProductDto.name);

    const existingSlug = await this.productRepository.findOne({
      where: { slug },
    });

    if (existingSlug) {
      throw new ConflictException('Product name already exists');
    }

    const productCode = await this.generateProductCode(createProductDto.name);

    const product = this.productRepository.create({
      subcategoryId: subcategory.id,
      productCode,
      name: createProductDto.name,
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

  async findAllBySubcategory(subcategoryId: string) {
    await this.findActiveSubcategory(subcategoryId);

    const products = await this.productRepository.find({
      where: {
        subcategoryId,
        isActive: true,
      },
      relations: {
        subcategory: {
          category: true,
        },
      },
      order: {
        isFeatured: 'DESC',
        createdAt: 'DESC',
      },
    });

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

    if (updateProductDto.name) {
      const slug = this.createSlug(updateProductDto.name);

      const existingSlug = await this.productRepository.findOne({
        where: {
          slug,
          id: Not(id),
        },
      });

      if (existingSlug) {
        throw new ConflictException('Product name already exists');
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

    const subcategory = await this.findActiveSubcategory(
      updateProductSubcategoryDto.subcategoryId,
    );

    product.subcategoryId = subcategory.id;

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

    const savedProduct = await this.productRepository.save(product);

    return this.findOne(savedProduct.id);
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

  private async generateProductCode(name: string) {
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
            description: product.subcategory.description,
            imageUrl: product.subcategory.imageUrl,
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
