import { Category } from '../../categories/entities/category.entity';
export declare class Product {
    id: string;
    categoryId: string;
    category: Category;
    productCode?: string;
    name: string;
    slug: string;
    description?: string;
    price: string;
    salePrice?: string;
    thumbnailUrl?: string;
    isActive: boolean;
    isFeatured: boolean;
    createdAt: Date;
    updatedAt: Date;
}
