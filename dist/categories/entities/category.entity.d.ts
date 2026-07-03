import { Product } from '../../products/entities/product.entity';
export declare class Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    displayOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    products: Product[];
}
