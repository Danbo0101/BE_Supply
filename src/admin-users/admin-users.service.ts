import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Not, QueryFailedError, Repository } from 'typeorm';

import { ChangeAdminPasswordDto } from './dto/change-admin-password.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { ResetAdminPasswordDto } from './dto/reset-admin-password.dto';
import { UpdateAdminUserProfileDto } from './dto/update-admin-user-profile.dto';
import { UpdateAdminUserRoleDto } from './dto/update-admin-user-role.dto';
import { UpdateAdminUserStatusDto } from './dto/update-admin-user-status.dto';
import { AdminUser } from './entities/admin-user.entity';
import { AdminRole } from './enums/admin-role.enum';

@Injectable()
export class AdminUsersService {
  private readonly passwordSaltRounds = 10;

  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
  ) {}

  async create(createAdminUserDto: CreateAdminUserDto) {
    const email = this.normalizeEmail(createAdminUserDto.email);

    const fullName = this.normalizeFullName(createAdminUserDto.fullName);

    const existingAdminUser = await this.adminUserRepository.findOne({
      where: {
        email,
      },
    });

    if (existingAdminUser) {
      throw new ConflictException('Admin user email already exists');
    }

    const passwordHash = await bcrypt.hash(
      createAdminUserDto.password,
      this.passwordSaltRounds,
    );

    const adminUser = this.adminUserRepository.create({
      fullName,
      email,
      passwordHash,
      role: createAdminUserDto.role ?? AdminRole.ADMIN,
      isActive: true,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    });

    try {
      const savedAdminUser = await this.adminUserRepository.save(adminUser);

      return this.toAdminUserResponse(savedAdminUser);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Admin user email already exists');
      }

      throw error;
    }
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
      where: {
        id,
      },
    });

    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    return this.toAdminUserResponse(adminUser);
  }

  /**
   * Dùng nội bộ cho AuthService khi đăng nhập.
   * Phải lấy passwordHash kể cả khi entity để select: false.
   */
  async findByEmail(email: string) {
    const normalizedEmail = this.normalizeEmail(email);

    return this.adminUserRepository
      .createQueryBuilder('adminUser')
      .addSelect('adminUser.passwordHash')
      .addSelect('adminUser.refreshTokenHash')
      .addSelect('adminUser.refreshTokenExpiresAt')
      .where('adminUser.email = :email', {
        email: normalizedEmail,
      })
      .getOne();
  }

  /**
   * Chỉ cập nhật fullName và email.
   */
  async updateProfile(id: string, dto: UpdateAdminUserProfileDto) {
    const adminUser = await this.adminUserRepository.findOne({
      where: {
        id,
      },
    });

    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    let emailChanged = false;

    if (dto.email !== undefined) {
      const email = this.normalizeEmail(dto.email);

      const existingAdminUser = await this.adminUserRepository.findOne({
        where: {
          email,
          id: Not(id),
        },
      });

      if (existingAdminUser) {
        throw new ConflictException('Admin user email already exists');
      }

      if (email !== adminUser.email) {
        adminUser.email = email;
        emailChanged = true;
      }
    }

    if (dto.fullName !== undefined) {
      adminUser.fullName = this.normalizeFullName(dto.fullName);
    }

    // Đổi email là thay đổi thông tin đăng nhập.
    if (emailChanged) {
      adminUser.refreshTokenHash = null;
      adminUser.refreshTokenExpiresAt = null;
    }

    try {
      const savedAdminUser = await this.adminUserRepository.save(adminUser);

      return this.toAdminUserResponse(savedAdminUser);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Admin user email already exists');
      }

      throw error;
    }
  }

  /**
   * Admin đang đăng nhập tự đổi password.
   */
  async changePassword(id: string, dto: ChangeAdminPasswordDto) {
    const adminUser = await this.findRawById(id);

    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    if (!adminUser.isActive) {
      throw new BadRequestException(
        'Inactive admin user cannot change password',
      );
    }

    const currentPasswordMatches = await bcrypt.compare(
      dto.currentPassword,
      adminUser.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordMatchesCurrent = await bcrypt.compare(
      dto.newPassword,
      adminUser.passwordHash,
    );

    if (newPasswordMatchesCurrent) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    adminUser.passwordHash = await bcrypt.hash(
      dto.newPassword,
      this.passwordSaltRounds,
    );

    // Thu hồi refresh token hiện tại.
    adminUser.refreshTokenHash = null;
    adminUser.refreshTokenExpiresAt = null;

    await this.adminUserRepository.save(adminUser);

    return {
      message: 'Password changed successfully',
    };
  }

  /**
   * Owner/Super Admin reset password cho admin khác.
   * Quyền gọi API phải được kiểm tra tại Guard/Controller.
   */
  async resetPassword(id: string, dto: ResetAdminPasswordDto) {
    const adminUser = await this.adminUserRepository.findOne({
      where: {
        id,
      },
    });

    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    adminUser.passwordHash = await bcrypt.hash(
      dto.newPassword,
      this.passwordSaltRounds,
    );

    adminUser.refreshTokenHash = null;
    adminUser.refreshTokenExpiresAt = null;

    const savedAdminUser = await this.adminUserRepository.save(adminUser);

    return {
      message: 'Admin password reset successfully',

      adminUser: this.toAdminUserResponse(savedAdminUser),
    };
  }

  /**
   * Đổi role riêng.
   * Controller phải giới hạn cho role có thẩm quyền.
   */
  async updateRole(id: string, dto: UpdateAdminUserRoleDto) {
    const adminUser = await this.adminUserRepository.findOne({
      where: {
        id,
      },
    });

    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    if (adminUser.role === dto.role) {
      return this.toAdminUserResponse(adminUser);
    }

    adminUser.role = dto.role;

    // Role đã thay đổi, thu hồi phiên đăng nhập cũ.
    adminUser.refreshTokenHash = null;
    adminUser.refreshTokenExpiresAt = null;

    const savedAdminUser = await this.adminUserRepository.save(adminUser);

    return this.toAdminUserResponse(savedAdminUser);
  }

  /**
   * Bật hoặc tắt tài khoản.
   */
  async updateStatus(id: string, dto: UpdateAdminUserStatusDto) {
    const adminUser = await this.adminUserRepository.findOne({
      where: {
        id,
      },
    });

    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    adminUser.isActive = dto.isActive;

    if (!adminUser.isActive) {
      adminUser.refreshTokenHash = null;
      adminUser.refreshTokenExpiresAt = null;
    }

    const savedAdminUser = await this.adminUserRepository.save(adminUser);

    return this.toAdminUserResponse(savedAdminUser);
  }

  /**
   * Dùng nội bộ cho AuthService.
   */
  async findRawById(id: string) {
    return this.adminUserRepository
      .createQueryBuilder('adminUser')
      .addSelect('adminUser.passwordHash')
      .addSelect('adminUser.refreshTokenHash')
      .addSelect('adminUser.refreshTokenExpiresAt')
      .where('adminUser.id = :id', {
        id,
      })
      .getOne();
  }

  /**
   * Dùng khi tạo hoặc thu hồi refresh token.
   */
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
      .where('id = :id', {
        id,
      })
      .execute();
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

  private normalizeEmail(value: string): string {
    const email = value.trim().toLowerCase();

    if (!email) {
      throw new BadRequestException('Admin user email is required');
    }

    return email;
  }

  private normalizeFullName(value: string): string {
    const fullName = value.trim();

    if (!fullName) {
      throw new BadRequestException('Admin user full name is required');
    }

    return fullName;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (
        error.driverError as {
          code?: string;
        }
      ).code === '23505'
    );
  }
}
