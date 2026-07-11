import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const existingCustomer = await this.findExistingCustomer(
      createCustomerDto.email,
      createCustomerDto.phone,
    );

    if (existingCustomer) {
      throw new ConflictException('Customer already exists');
    }

    const customerCode = await this.generateCustomerCode();

    const customer = this.customerRepository.create({
      ...createCustomerDto,
      customerCode,
      email: createCustomerDto.email?.toLowerCase(),
    });

    return this.customerRepository.save(customer);
  }

  async findOrCreate(createCustomerDto: CreateCustomerDto) {
    const existingCustomer = await this.findExistingCustomer(
      createCustomerDto.email,
      createCustomerDto.phone,
    );

    if (existingCustomer) {
      return existingCustomer;
    }

    const customerCode = await this.generateCustomerCode();

    const customer = this.customerRepository.create({
      ...createCustomerDto,
      customerCode,
      email: createCustomerDto.email?.toLowerCase(),
    });

    return this.customerRepository.save(customer);
  }

  async findAll() {
    return this.customerRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string) {
    const customer = await this.customerRepository.findOne({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.customerRepository.findOne({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (
      updateCustomerDto.email !== undefined ||
      updateCustomerDto.phone !== undefined
    ) {
      const existingCustomer = await this.findExistingCustomerExceptId(
        id,
        updateCustomerDto.email,
        updateCustomerDto.phone,
      );

      if (existingCustomer) {
        throw new ConflictException('Customer email or phone already exists');
      }
    }

    if (updateCustomerDto.fullName !== undefined) {
      customer.fullName = updateCustomerDto.fullName;
    }

    if (updateCustomerDto.email !== undefined) {
      customer.email = updateCustomerDto.email.toLowerCase();
    }

    if (updateCustomerDto.phone !== undefined) {
      customer.phone = updateCustomerDto.phone;
    }

    if (updateCustomerDto.defaultAddress !== undefined) {
      customer.defaultAddress = updateCustomerDto.defaultAddress;
    }

    if (updateCustomerDto.note !== undefined) {
      customer.note = updateCustomerDto.note;
    }

    return this.customerRepository.save(customer);
  }

  private async findExistingCustomer(email?: string, phone?: string) {
    if (!email && !phone) {
      return null;
    }

    const queryBuilder = this.customerRepository.createQueryBuilder('customer');

    queryBuilder.where(
      new Brackets((qb) => {
        if (email) {
          qb.orWhere('LOWER(customer.email) = :email', {
            email: email.toLowerCase(),
          });
        }

        if (phone) {
          qb.orWhere('customer.phone = :phone', {
            phone,
          });
        }
      }),
    );

    return queryBuilder.getOne();
  }

  private async generateCustomerCode() {
    const latestCustomer = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.customerCode LIKE :pattern', {
        pattern: 'CUS-%',
      })
      .orderBy('customer.customerCode', 'DESC')
      .getOne();

    const latestNumber = latestCustomer?.customerCode
      ? Number(latestCustomer.customerCode.split('-')[1])
      : 0;

    const nextNumber = latestNumber + 1;

    return `CUS-${String(nextNumber).padStart(5, '0')}`;
  }

  private async findExistingCustomerExceptId(
    id: string,
    email?: string,
    phone?: string,
  ) {
    if (!email && !phone) {
      return null;
    }

    const queryBuilder = this.customerRepository.createQueryBuilder('customer');

    queryBuilder.where('customer.id != :id', { id });

    queryBuilder.andWhere(
      new Brackets((qb) => {
        if (email) {
          qb.orWhere('LOWER(customer.email) = :email', {
            email: email.toLowerCase(),
          });
        }

        if (phone) {
          qb.orWhere('customer.phone = :phone', {
            phone,
          });
        }
      }),
    );

    return queryBuilder.getOne();
  }
}
