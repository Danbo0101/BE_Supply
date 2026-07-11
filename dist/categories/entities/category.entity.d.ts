import { Subcategory } from '../../subcategories/entities/subcategory.entity';
export declare class Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    displayOrder: number;
    isActive: boolean;
    subcategories: Subcategory[];
    createdAt: Date;
    updatedAt: Date;
}
