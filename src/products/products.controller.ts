import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductSubcategoryDto } from './dto/update-product-subcategory.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('subcategories/:subcategoryId/products')
  createForSubcategory(
    @Param('subcategoryId') subcategoryId: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.createForSubcategory(
      subcategoryId,
      createProductDto,
    );
  }

  @Get('subcategories/:subcategoryId/products')
  findAllBySubcategory(@Param('subcategoryId') subcategoryId: string) {
    return this.productsService.findAllBySubcategory(subcategoryId);
  }

  @Get('products/:id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch('products/:id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Patch('products/:id/subcategory')
  updateSubcategory(
    @Param('id') id: string,
    @Body() updateProductSubcategoryDto: UpdateProductSubcategoryDto,
  ) {
    return this.productsService.updateSubcategory(
      id,
      updateProductSubcategoryDto,
    );
  }

  @Patch('products/:id/active')
  updateStatus(
    @Param('id') id: string,
    @Body() updateProductStatusDto: UpdateProductStatusDto,
  ) {
    return this.productsService.updateStatus(id, updateProductStatusDto);
  }
}
