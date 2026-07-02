import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findAll() {
    return this.productRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async create(data: { name: string; price: number; description?: string }) {
    const product = this.productRepository.create(data);
    return this.productRepository.save(product);
  }
}
