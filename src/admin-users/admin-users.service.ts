import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Not, Repository } from 'typeorm';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserStatusDto } from './dto/update-admin-user-status.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { AdminUser } from './entities/admin-user.entity';
import { AdminRole } from './enums/admin-role.enum';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
  ) {}

  async create(createAdminUserDto: CreateAdminUserDto) {
    const email = createAdminUserDto.email.toLowerCase();

    const existingAdminUser = await this.adminUserRepository.findOne({
      where: { email },
    });

    if (existingAdminUser) {
      throw new ConflictException('Admin user email already exists');
    }

    const passwordHash = await bcrypt.hash(createAdminUserDto.password, 10);

    const adminUser = this.adminUserRepository.create({
      fullName: createAdminUserDto.fullName,
      email,
      passwordHash,
      role: createAdminUserDto.role ?? AdminRole.ADMIN,
      isActive: true,
    });

    const savedAdminUser = await this.adminUserRepository.save(adminUser);

    return this.toAdminUserResponse(savedAdminUser);
  }

  async findAll() {
    const adminUsers = await this.adminUserRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });

    return adminUsers.map((adminUser) => this.toAdminUserResponse(adminUser));
  }

  async findOne(id: string) {
    const adminUser = await this.adminUserRepository.findOne({
      where: { id },
    });

    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    return this.toAdminUserResponse(adminUser);
  }

  async findByEmail(email: string) {
    return this.adminUserRepository.findOne({
      where: {
        email: email.toLowerCase(),
      },
    });
  }

  async update(id: string, updateAdminUserDto: UpdateAdminUserDto) {
    const adminUser = await this.adminUserRepository.findOne({
      where: { id },
    });

    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    if (updateAdminUserDto.email !== undefined) {
      const email = updateAdminUserDto.email.toLowerCase();

      const existingAdminUser = await this.adminUserRepository.findOne({
        where: {
          email,
          id: Not(id),
        },
      });

      if (existingAdminUser) {
        throw new ConflictException('Admin user email already exists');
      }

      adminUser.email = email;
    }

    if (updateAdminUserDto.fullName !== undefined) {
      adminUser.fullName = updateAdminUserDto.fullName;
    }

    if (updateAdminUserDto.password !== undefined) {
      adminUser.passwordHash = await bcrypt.hash(
        updateAdminUserDto.password,
        10,
      );
    }

    if (updateAdminUserDto.role !== undefined) {
      adminUser.role = updateAdminUserDto.role;
    }

    const savedAdminUser = await this.adminUserRepository.save(adminUser);

    return this.toAdminUserResponse(savedAdminUser);
  }

  async updateStatus(
    id: string,
    updateAdminUserStatusDto: UpdateAdminUserStatusDto,
  ) {
    const adminUser = await this.adminUserRepository.findOne({
      where: { id },
    });

    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    adminUser.isActive = updateAdminUserStatusDto.isActive;

    const savedAdminUser = await this.adminUserRepository.save(adminUser);

    return this.toAdminUserResponse(savedAdminUser);
  }

  toAdminUserResponse(adminUser: AdminUser) {
    return {
      id: adminUser.id,
      fullName: adminUser.fullName,
      email: adminUser.email,
      role: adminUser.role,
      isActive: adminUser.isActive,
      createdAt: adminUser.createdAt,
      updatedAt: adminUser.updatedAt,
    };
  }

  async findRawById(id: string) {
    return this.adminUserRepository.findOne({
      where: { id },
    });
  }

  async updateRefreshToken(
    id: string,
    refreshTokenHash: string | null,
    refreshTokenExpiresAt: Date | null,
  ) {
    await this.adminUserRepository
      .createQueryBuilder()
      .update(AdminUser)
      .set({
        refreshTokenHash,
        refreshTokenExpiresAt,
      })
      .where('id = :id', { id })
      .execute();
  }
}
