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
const node_crypto_1 = require("node:crypto");
const order_entity_1 = require("../orders/entities/order.entity");
let CustomersService = class CustomersService {
    customerRepository;
    orderRepository;
    constructor(customerRepository, orderRepository) {
        this.customerRepository = customerRepository;
        this.orderRepository = orderRepository;
    }
    async create(createCustomerDto) {
        const email = this.normalizeEmail(createCustomerDto.email);
        const phone = this.normalizePhone(createCustomerDto.phone);
        const existingCustomer = await this.findExistingCustomer(email, phone);
        if (existingCustomer) {
            throw new common_1.ConflictException('Customer email or phone already exists');
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
        }
        catch (error) {
            if (this.isUniqueViolation(error)) {
                throw new common_1.ConflictException('Customer email, phone or customer code already exists');
            }
            throw error;
        }
    }
    async findOrCreate(createCustomerDto, manager) {
        const customerRepository = manager
            ? manager.getRepository(customer_entity_1.Customer)
            : this.customerRepository;
        const email = this.normalizeEmail(createCustomerDto.email);
        const phone = this.normalizePhone(createCustomerDto.phone);
        if (!email && !phone) {
            throw new common_1.BadRequestException('Customer email or phone is required');
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
        if (customerByEmail &&
            customerByPhone &&
            customerByEmail.id !== customerByPhone.id) {
            throw new common_1.ConflictException('Customer email and phone belong to different customers');
        }
        const existingCustomer = customerByEmail ?? customerByPhone;
        if (existingCustomer) {
            const existingEmail = this.normalizeEmail(existingCustomer.email);
            const existingPhone = this.normalizePhone(existingCustomer.phone);
            if (email && existingEmail && email !== existingEmail) {
                throw new common_1.ConflictException('Phone already belongs to a customer with another email');
            }
            if (phone && existingPhone && phone !== existingPhone) {
                throw new common_1.ConflictException('Email already belongs to a customer with another phone');
            }
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
            }
            catch (error) {
                if (this.isUniqueViolation(error)) {
                    throw new common_1.ConflictException('Customer email or phone already exists');
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
        }
        catch (error) {
            if (this.isUniqueViolation(error)) {
                throw new common_1.ConflictException('Customer email, phone or customer code already exists');
            }
            throw error;
        }
    }
    async findAll(findCustomersQueryDto) {
        const { query, page = 1, limit = 20 } = findCustomersQueryDto;
        const queryBuilder = this.customerRepository.createQueryBuilder('customer');
        const searchValue = query?.trim();
        if (searchValue) {
            const keyword = `%${searchValue}%`;
            const phoneDigits = searchValue.replace(/\D/g, '');
            queryBuilder.andWhere(new typeorm_2.Brackets((qb) => {
                qb.where('customer.fullName ILIKE :keyword', {
                    keyword,
                });
                qb.orWhere('customer.email ILIKE :keyword', {
                    keyword,
                });
                qb.orWhere('customer.customerCode ILIKE :keyword', {
                    keyword,
                });
                if (phoneDigits) {
                    qb.orWhere('customer.phone LIKE :phoneKeyword', {
                        phoneKeyword: `%${phoneDigits}%`,
                    });
                }
            }));
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
    async findOne(id) {
        const customer = await this.customerRepository.findOne({
            where: { id },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        return customer;
    }
    async lookup(email, phone) {
        const normalizedEmail = this.normalizeEmail(email);
        const normalizedPhone = this.normalizePhone(phone);
        if (!normalizedEmail && !normalizedPhone) {
            throw new common_1.BadRequestException('Customer email or phone is required');
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
        if (customerByEmail &&
            customerByPhone &&
            customerByEmail.id !== customerByPhone.id) {
            throw new common_1.ConflictException('Email and phone belong to different customers');
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
            matchedBy: customerByEmail && customerByPhone
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
    async findOrders(customerId, queryDto) {
        const { page = 1, limit = 10 } = queryDto;
        const customerExists = await this.customerRepository.exists({
            where: {
                id: customerId,
            },
        });
        if (!customerExists) {
            throw new common_1.NotFoundException('Customer not found');
        }
        const skip = (page - 1) * limit;
        const [orders, total] = await this.orderRepository.findAndCount({
            where: {
                customerId,
            },
            select: {
                id: true,
                orderCode: true,
                totalAmount: true,
                paymentMethod: true,
                paymentProofUrl: true,
                status: true,
                submittedAt: true,
            },
            order: {
                createdAt: 'DESC',
            },
            skip,
            take: limit,
        });
        return {
            customerId,
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            items: orders.map((order) => ({
                id: order.id,
                orderCode: order.orderCode,
                totalAmount: order.totalAmount,
                paymentMethod: order.paymentMethod,
                paymentProofUrl: order.paymentProofUrl ?? null,
                status: order.status,
                submittedAt: order.submittedAt ?? null,
            })),
        };
    }
    async update(id, updateCustomerDto) {
        const customer = await this.customerRepository.findOne({
            where: { id },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        const email = updateCustomerDto.email !== undefined
            ? this.normalizeEmail(updateCustomerDto.email)
            : undefined;
        const phone = updateCustomerDto.phone !== undefined
            ? this.normalizePhone(updateCustomerDto.phone)
            : undefined;
        if (email !== undefined || phone !== undefined) {
            const existingCustomer = await this.findExistingCustomerExceptId(id, email, phone);
            if (existingCustomer) {
                throw new common_1.ConflictException('Customer email or phone already exists');
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
        }
        catch (error) {
            if (this.isUniqueViolation(error)) {
                throw new common_1.ConflictException('Customer email or phone already exists');
            }
            throw error;
        }
    }
    async findExistingCustomer(email, phone, customerRepository = this.customerRepository) {
        if (!email && !phone)
            return null;
        return customerRepository
            .createQueryBuilder('customer')
            .where(new typeorm_2.Brackets((qb) => {
            if (email) {
                qb.orWhere('customer.email = :email', { email });
            }
            if (phone) {
                qb.orWhere('customer.phone = :phone', { phone });
            }
        }))
            .getOne();
    }
    generateCustomerCode() {
        const randomPart = (0, node_crypto_1.randomUUID)()
            .replace(/-/g, '')
            .slice(0, 16)
            .toUpperCase();
        return `CUS-${randomPart}`;
    }
    async findExistingCustomerExceptId(id, email, phone, customerRepository = this.customerRepository) {
        if (!email && !phone)
            return null;
        return customerRepository
            .createQueryBuilder('customer')
            .where('customer.id != :id', { id })
            .andWhere(new typeorm_2.Brackets((qb) => {
            if (email) {
                qb.orWhere('customer.email = :email', { email });
            }
            if (phone) {
                qb.orWhere('customer.phone = :phone', { phone });
            }
        }))
            .getOne();
    }
    normalizeEmail(value) {
        const email = value?.trim().toLowerCase();
        return email || undefined;
    }
    normalizePhone(value) {
        if (!value?.trim())
            return undefined;
        let digits = value.replace(/\D/g, '');
        if (digits.length === 11 && digits.startsWith('1')) {
            digits = digits.slice(1);
        }
        if (digits.length !== 10) {
            throw new common_1.BadRequestException('Customer phone must contain exactly 10 digits');
        }
        return digits;
    }
    isUniqueViolation(error) {
        return (error instanceof typeorm_2.QueryFailedError &&
            error.driverError.code === '23505');
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __param(1, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], CustomersService);
//# sourceMappingURL=customers.service.js.map