import { Product } from '../../products/entities/product.entity';
import { Order } from './order.entity';
export declare class OrderItem {
    id: string;
    orderId: string;
    order: Order;
    productId?: string;
    product?: Product;
    productCode?: string;
    productName: string;
    productThumbnailUrl?: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    createdAt: Date;
}
