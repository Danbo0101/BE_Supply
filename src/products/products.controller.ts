import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductsService } from './products.service';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('categories/:categoryId/products')
  createForCategory(
    @Param('categoryId') categoryId: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.createForCategory(categoryId, createProductDto);
  }

  @Get('categories/:categoryId/products')
  findAllByCategory(@Param('categoryId') categoryId: string) {
    return this.productsService.findAllByCategory(categoryId);
  }

  @Get('products/:id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch('products/:id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Patch('products/:id/category')
  updateCategory(
    @Param('id') id: string,
    @Body() updateProductCategoryDto: UpdateProductCategoryDto,
  ) {
    return this.productsService.updateCategory(id, updateProductCategoryDto);
  }

  @Patch('products/:id/active')
  updateStatus(
    @Param('id') id: string,
    @Body() updateProductStatusDto: UpdateProductStatusDto,
  ) {
    return this.productsService.updateStatus(id, updateProductStatusDto);
  }
}
