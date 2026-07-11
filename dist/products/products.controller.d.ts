import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductSubcategoryDto } from './dto/update-product-subcategory.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
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
    findAllBySubcategory(subcategoryId: string, sort?: string, minPrice?: string, maxPrice?: string): Promise<{
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
    updateStatus(id: string, updateProductStatusDto: UpdateProductStatusDto): Promise<{
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
}
