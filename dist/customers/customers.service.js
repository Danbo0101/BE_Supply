"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customer_entity_1 = require("./entities/customer.entity");
let CustomersService = class CustomersService {
    customerRepository;
    constructor(customerRepository) {
        this.customerRepository = customerRepository;
    }
    async create(createCustomerDto) {
        const existingCustomer = await this.findExistingCustomer(createCustomerDto.email, createCustomerDto.phone);
        if (existingCustomer) {
            throw new common_1.ConflictException('Customer already exists');
        }
        const customerCode = await this.generateCustomerCode();
        const customer = this.customerRepository.create({
            ...createCustomerDto,
            customerCode,
            email: createCustomerDto.email?.toLowerCase(),
        });
        return this.customerRepository.save(customer);
    }
    async findOrCreate(createCustomerDto) {
        const existingCustomer = await this.findExistingCustomer(createCustomerDto.email, createCustomerDto.phone);
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
    async findOne(id) {
        const customer = await this.customerRepository.findOne({
            where: { id },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        return customer;
    }
    async update(id, updateCustomerDto) {
        const customer = await this.customerRepository.findOne({
            where: { id },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        if (updateCustomerDto.email !== undefined ||
            updateCustomerDto.phone !== undefined) {
            const existingCustomer = await this.findExistingCustomerExceptId(id, updateCustomerDto.email, updateCustomerDto.phone);
            if (existingCustomer) {
                throw new common_1.ConflictException('Customer email or phone already exists');
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
    async findExistingCustomer(email, phone) {
        if (!email && !phone) {
            return null;
        }
        const queryBuilder = this.customerRepository.createQueryBuilder('customer');
        queryBuilder.where(new typeorm_2.Brackets((qb) => {
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
        }));
        return queryBuilder.getOne();
    }
    async generateCustomerCode() {
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
    async findExistingCustomerExceptId(id, email, phone) {
        if (!email && !phone) {
            return null;
        }
        const queryBuilder = this.customerRepository.createQueryBuilder('customer');
        queryBuilder.where('customer.id != :id', { id });
        queryBuilder.andWhere(new typeorm_2.Brackets((qb) => {
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
        }));
        return queryBuilder.getOne();
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CustomersService);
//# sourceMappingURL=customers.service.js.map