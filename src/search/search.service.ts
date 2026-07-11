import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async searchProducts(query?: string) {
    const keyword = query?.trim();

    if (!keyword || keyword.length < 2) {
      return {
        query: keyword ?? '',
        suggestions: [],
        products: [],
      };
    }

    const pattern = `%${keyword}%`;

    const suggestionsRaw = await this.productRepository
      .createQueryBuilder('product')
      .innerJoin('product.subcategory', 'subcategory')
      .innerJoin('subcategory.category', 'category')
      .select('DISTINCT product.name', 'name')
      .where('product.isActive = true')
      .andWhere('subcategory.isActive = true')
      .andWhere('category.isActive = true')
      .andWhere('product.name ILIKE :pattern', { pattern })
      .orderBy('product.name', 'ASC')
      .limit(6)
      .getRawMany<{ name: string }>();

    const products = await this.productRepository
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.subcategory', 'subcategory')
      .innerJoinAndSelect('subcategory.category', 'category')
      .where('product.isActive = true')
      .andWhere('subcategory.isActive = true')
      .andWhere('category.isActive = true')
      .andWhere(
        new Brackets((qb) => {
          qb.where('product.name ILIKE :pattern', { pattern })
            .orWhere('product.productCode ILIKE :pattern', { pattern })
            .orWhere('product.description ILIKE :pattern', { pattern });
        }),
      )
      .orderBy('product.isFeatured', 'DESC')
      .addOrderBy('product.createdAt', 'DESC')
      .limit(6)
      .getMany();

    return {
      query: keyword,
      suggestions: suggestionsRaw.map((item) => item.name),
      products: products.map((product) => ({
        id: product.id,
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
      })),
    };
  }
}
