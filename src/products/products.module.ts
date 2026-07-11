import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subcategory } from '../subcategories/entities/subcategory.entity';
import { Product } from './entities/product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Subcategory])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
