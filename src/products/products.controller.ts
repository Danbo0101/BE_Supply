import { Body, Controller, Get, Post } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      price: number;
      description?: string;
    },
  ) {
    return this.productsService.create(body);
  }
}
