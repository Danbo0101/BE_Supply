import { Subcategory } from '../../subcategories/entities/subcategory.entity';
export declare class Product {
    id: string;
    subcategoryId: string;
    subcategory: Subcategory;
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
