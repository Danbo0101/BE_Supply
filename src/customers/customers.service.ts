import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, QueryFailedError, Repository } from 'typeorm';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import { EntityManager } from 'typeorm';
import { FindCustomersQueryDto } from './dto/find-customers-query.dto';
import { randomUUID } from 'node:crypto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const email = this.normalizeEmail(createCustomerDto.email);
    const phone = this.normalizePhone(createCustomerDto.phone);

    const existingCustomer = await this.findExistingCustomer(email, phone);

    if (existingCustomer) {
      throw new ConflictException('Customer email or phone already exists');
    }

    const customerCode = this.generateCustomerCode();

    const customer = this.customerRepository.create({
      ...createCustomerDto,
      fullName: createCustomerDto.fullName.trim(),
      defaultAddress: createCustomerDto.defaultAddress?.trim(),
      customerCode,
      email,
      phone,
    });
    try {
      return await this.customerRepository.save(customer);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'Customer email, phone or customer code already exists',
        );
      }

      throw error;
    }
  }

  async findOrCreate(
    createCustomerDto: CreateCustomerDto,
    manager?: EntityManager,
  ) {
    const customerRepository = manager
      ? manager.getRepository(Customer)
      : this.customerRepository;

    const email = this.normalizeEmail(createCustomerDto.email);
    const phone = this.normalizePhone(createCustomerDto.phone);

    if (!email && !phone) {
      throw new BadRequestException('Customer email or phone is required');
    }

    const customerByEmail = email
      ? await customerRepository.findOne({
          where: { email },
        })
      : null;

    const customerByPhone = phone
      ? await customerRepository.findOne({
          where: { phone },
        })
      : null;

    // Email thuộc customer A, phone thuộc customer B
    if (
      customerByEmail &&
      customerByPhone &&
      customerByEmail.id !== customerByPhone.id
    ) {
      throw new ConflictException(
        'Customer email and phone belong to different customers',
      );
    }

    const existingCustomer = customerByEmail ?? customerByPhone;

    if (existingCustomer) {
      const existingEmail = this.normalizeEmail(existingCustomer.email);
      const existingPhone = this.normalizePhone(existingCustomer.phone);

      // Tìm thấy bằng phone nhưng email lại khác
      if (email && existingEmail && email !== existingEmail) {
        throw new ConflictException(
          'Phone already belongs to a customer with another email',
        );
      }

      // Tìm thấy bằng email nhưng phone lại khác
      if (phone && existingPhone && phone !== existingPhone) {
        throw new ConflictException(
          'Email already belongs to a customer with another phone',
        );
      }

      // Chỉ bổ sung contact đang thiếu, không ghi đè dữ liệu cũ
      let shouldSave = false;

      if (!existingEmail && email) {
        existingCustomer.email = email;
        shouldSave = true;
      }

      if (!existingPhone && phone) {
        existingCustomer.phone = phone;
        shouldSave = true;
      }

      if (!shouldSave) {
        return existingCustomer;
      }

      try {
        return await customerRepository.save(existingCustomer);
      } catch (error) {
        if (this.isUniqueViolation(error)) {
          throw new ConflictException('Customer email or phone already exists');
        }

        throw error;
      }
    }

    const customerCode = this.generateCustomerCode();

    const customer = customerRepository.create({
      ...createCustomerDto,
      fullName: createCustomerDto.fullName.trim(),
      defaultAddress: createCustomerDto.defaultAddress?.trim(),
      customerCode,
      email,
      phone,
    });

    try {
      return await customerRepository.save(customer);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'Customer email, phone or customer code already exists',
        );
      }

      throw error;
    }
  }

  async findAll(findCustomersQueryDto: FindCustomersQueryDto) {
    const { query, page = 1, limit = 20 } = findCustomersQueryDto;

    const queryBuilder = this.customerRepository.createQueryBuilder('customer');

    const searchValue = query?.trim();

    if (searchValue) {
      const keyword = `%${searchValue}%`;
      const phoneDigits = searchValue.replace(/\D/g, '');

      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('customer.fullName ILIKE :keyword', {
            keyword,
          });

          qb.orWhere('customer.email ILIKE :keyword', {
            keyword,
          });

          qb.orWhere('customer.customerCode ILIKE :keyword', {
            keyword,
          });

          // Chỉ tìm phone nếu query có chữ số
          if (phoneDigits) {
            qb.orWhere('customer.phone LIKE :phoneKeyword', {
              phoneKeyword: `%${phoneDigits}%`,
            });
          }
        }),
      );
    }

    const skip = (page - 1) * limit;

    const [items, total] = await queryBuilder
      .orderBy('customer.createdAt', 'DESC')
      .addOrderBy('customer.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      query: searchValue || null,
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      items,
    };
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

  async lookup(email?: string, phone?: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const normalizedPhone = this.normalizePhone(phone);

    if (!normalizedEmail && !normalizedPhone) {
      throw new BadRequestException('Customer email or phone is required');
    }

    const customerByEmail = normalizedEmail
      ? await this.customerRepository.findOne({
          where: { email: normalizedEmail },
        })
      : null;

    const customerByPhone = normalizedPhone
      ? await this.customerRepository.findOne({
          where: { phone: normalizedPhone },
        })
      : null;

    if (
      customerByEmail &&
      customerByPhone &&
      customerByEmail.id !== customerByPhone.id
    ) {
      throw new ConflictException(
        'Email and phone belong to different customers',
      );
    }

    const customer = customerByEmail ?? customerByPhone;

    if (!customer) {
      return {
        found: false,
        matchedBy: null,
        customer: null,
      };
    }

    return {
      found: true,
      matchedBy:
        customerByEmail && customerByPhone
          ? 'email_and_phone'
          : customerByEmail
            ? 'email'
            : 'phone',
      customer: {
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        defaultAddress: customer.defaultAddress,
      },
    };
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.customerRepository.findOne({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const email =
      updateCustomerDto.email !== undefined
        ? this.normalizeEmail(updateCustomerDto.email)
        : undefined;

    const phone =
      updateCustomerDto.phone !== undefined
        ? this.normalizePhone(updateCustomerDto.phone)
        : undefined;

    if (email !== undefined || phone !== undefined) {
      const existingCustomer = await this.findExistingCustomerExceptId(
        id,
        email,
        phone,
      );

      if (existingCustomer) {
        throw new ConflictException('Customer email or phone already exists');
      }
    }

    if (updateCustomerDto.fullName !== undefined) {
      customer.fullName = updateCustomerDto.fullName.trim();
    }

    if (email !== undefined) {
      customer.email = email;
    }

    if (phone !== undefined) {
      customer.phone = phone;
    }

    if (updateCustomerDto.defaultAddress !== undefined) {
      customer.defaultAddress = updateCustomerDto.defaultAddress.trim();
    }

    if (updateCustomerDto.note !== undefined) {
      customer.note = updateCustomerDto.note.trim();
    }

    try {
      return await this.customerRepository.save(customer);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Customer email or phone already exists');
      }

      throw error;
    }
  }

  private async findExistingCustomer(
    email?: string,
    phone?: string,
    customerRepository = this.customerRepository,
  ) {
    if (!email && !phone) return null;

    return customerRepository
      .createQueryBuilder('customer')
      .where(
        new Brackets((qb) => {
          if (email) {
            qb.orWhere('customer.email = :email', { email });
          }

          if (phone) {
            qb.orWhere('customer.phone = :phone', { phone });
          }
        }),
      )
      .getOne();
  }

  private generateCustomerCode(): string {
    const randomPart = randomUUID()
      .replace(/-/g, '')
      .slice(0, 16)
      .toUpperCase();

    return `CUS-${randomPart}`;
  }

  private async findExistingCustomerExceptId(
    id: string,
    email?: string,
    phone?: string,
    customerRepository = this.customerRepository,
  ) {
    if (!email && !phone) return null;

    return customerRepository
      .createQueryBuilder('customer')
      .where('customer.id != :id', { id })
      .andWhere(
        new Brackets((qb) => {
          if (email) {
            qb.orWhere('customer.email = :email', { email });
          }

          if (phone) {
            qb.orWhere('customer.phone = :phone', { phone });
          }
        }),
      )
      .getOne();
  }

  private normalizeEmail(value?: string): string | undefined {
    const email = value?.trim().toLowerCase();
    return email || undefined;
  }

  private normalizePhone(value?: string): string | undefined {
    if (!value?.trim()) return undefined;

    let digits = value.replace(/\D/g, '');

    // +1 (713) 555-0101 → 7135550101
    if (digits.length === 11 && digits.startsWith('1')) {
      digits = digits.slice(1);
    }

    if (digits.length !== 10) {
      throw new BadRequestException(
        'Customer phone must contain exactly 10 digits',
      );
    }

    return digits;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === '23505'
    );
  }
}
