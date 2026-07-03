import { Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { Product } from './entities/product.entity';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
export declare class ProductsService {
    private readonly productRepository;
    private readonly categoryRepository;
    constructor(productRepository: Repository<Product>, categoryRepository: Repository<Category>);
    createForCategory(categoryId: string, createProductDto: CreateProductDto): Promise<{
        id: string;
        categoryId: string;
        productCode: string | undefined;
        name: string;
        slug: string;
        description: string | undefined;
        price: number;
        salePrice: number | null;
        thumbnailUrl: string | undefined;
        isActive: boolean;
        isFeatured: boolean;
        createdAt: Date;
        updatedAt: Date;
        category: {
            name: string;
            slug: string;
            description: string | undefined;
            imageUrl: string | undefined;
        } | null;
    }>;
    findAllByCategory(categoryId: string): Promise<{
        id: string;
        categoryId: string;
        productCode: string | undefined;
        name: string;
        slug: string;
        description: string | undefined;
        price: number;
        salePrice: number | null;
        thumbnailUrl: string | undefined;
        isActive: boolean;
        isFeatured: boolean;
        createdAt: Date;
        updatedAt: Date;
        category: {
            name: string;
            slug: string;
            description: string | undefined;
            imageUrl: string | undefined;
        } | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        categoryId: string;
        productCode: string | undefined;
        name: string;
        slug: string;
        description: string | undefined;
        price: number;
        salePrice: number | null;
        thumbnailUrl: string | undefined;
        isActive: boolean;
        isFeatured: boolean;
        createdAt: Date;
        updatedAt: Date;
        category: {
            name: string;
            slug: string;
            description: string | undefined;
            imageUrl: string | undefined;
        } | null;
    }>;
    update(id: string, updateProductDto: UpdateProductDto): Promise<{
        id: string;
        categoryId: string;
        productCode: string | undefined;
        name: string;
        slug: string;
        description: string | undefined;
        price: number;
        salePrice: number | null;
        thumbnailUrl: string | undefined;
        isActive: boolean;
        isFeatured: boolean;
        createdAt: Date;
        updatedAt: Date;
        category: {
            name: string;
            slug: string;
            description: string | undefined;
            imageUrl: string | undefined;
        } | null;
    }>;
    updateCategory(id: string, updateProductCategoryDto: UpdateProductCategoryDto): Promise<{
        id: string;
        categoryId: string;
        productCode: string | undefined;
        name: string;
        slug: string;
        description: string | undefined;
        price: number;
        salePrice: number | null;
        thumbnailUrl: string | undefined;
        isActive: boolean;
        isFeatured: boolean;
        createdAt: Date;
        updatedAt: Date;
        category: {
            name: string;
            slug: string;
            description: string | undefined;
            imageUrl: string | undefined;
        } | null;
    }>;
    updateStatus(id: string, updateProductStatusDto: UpdateProductStatusDto): Promise<{
        id: string;
        categoryId: string;
        productCode: string | undefined;
        name: string;
        slug: string;
        description: string | undefined;
        price: number;
        salePrice: number | null;
        thumbnailUrl: string | undefined;
        isActive: boolean;
        isFeatured: boolean;
        createdAt: Date;
        updatedAt: Date;
        category: {
            name: string;
            slug: string;
            description: string | undefined;
            imageUrl: string | undefined;
        } | null;
    }>;
    private generateProductCode;
    private createSlug;
    private toProductResponse;
}
