import { Repository } from 'typeorm';
import { Subcategory } from '../subcategories/entities/subcategory.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductSubcategoryDto } from './dto/update-product-subcategory.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { SearchProductsDto } from './dto/search-products.dto';
export declare class ProductsService {
    private readonly productRepository;
    private readonly subcategoryRepository;
    constructor(productRepository: Repository<Product>, subcategoryRepository: Repository<Subcategory>);
    searchForOrder(searchProductsDto: SearchProductsDto): Promise<{
        query: string;
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        items: {
            id: string;
            productCode: string;
            name: string;
            thumbnailUrl: string | null;
            displayPrice: string;
            originalPrice: string;
            hasDiscount: boolean;
            isAvailable: boolean;
            categoryName: string;
            subcategoryName: string;
        }[];
    }>;
    createForSubcategory(subcategoryId: string, createProductDto: CreateProductDto): Promise<{
        id: string;
        subcategoryId: string;
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
        subcategory: {
            id: string;
            name: string;
            slug: string;
            category: {
                id: string;
                name: string;
                slug: string;
            } | null;
        } | null;
    }>;
    findAllBySubcategory(subcategoryId: string, sort?: string, minPrice?: string, maxPrice?: string, query?: string): Promise<{
        id: string;
        subcategoryId: string;
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
        subcategory: {
            id: string;
            name: string;
            slug: string;
            category: {
                id: string;
                name: string;
                slug: string;
            } | null;
        } | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        subcategoryId: string;
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
        subcategory: {
            id: string;
            name: string;
            slug: string;
            category: {
                id: string;
                name: string;
                slug: string;
            } | null;
        } | null;
    }>;
    update(id: string, updateProductDto: UpdateProductDto): Promise<{
        id: string;
        subcategoryId: string;
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
        subcategory: {
            id: string;
            name: string;
            slug: string;
            category: {
                id: string;
                name: string;
                slug: string;
            } | null;
        } | null;
    }>;
    updateSubcategory(id: string, updateProductSubcategoryDto: UpdateProductSubcategoryDto): Promise<{
        id: string;
        subcategoryId: string;
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
        subcategory: {
            id: string;
            name: string;
            slug: string;
            category: {
                id: string;
                name: string;
                slug: string;
            } | null;
        } | null;
    }>;
    updateStatus(id: string, updateProductStatusDto: UpdateProductStatusDto): Promise<Product>;
    private findActiveSubcategory;
    private validateSalePrice;
    private generateProductCode;
    private createSlug;
    private toProductResponse;
}
