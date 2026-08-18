import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminUsersService } from './admin-users.service';
import { ChangeAdminPasswordDto } from './dto/change-admin-password.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { ResetAdminPasswordDto } from './dto/reset-admin-password.dto';
import { UpdateAdminUserProfileDto } from './dto/update-admin-user-profile.dto';
import { UpdateAdminUserRoleDto } from './dto/update-admin-user-role.dto';
import { UpdateAdminUserStatusDto } from './dto/update-admin-user-status.dto';

interface AuthenticatedAdminRequest extends Request {
  user: {
    id: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('admin-users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  /**
   * Tạo admin mới.
   * Sau này nên giới hạn cho Owner/Super Admin.
   */
  @Post()
  create(
    @Body()
    createAdminUserDto: CreateAdminUserDto,
  ) {
    return this.adminUsersService.create(createAdminUserDto);
  }

  /**
   * Lấy danh sách admin.
   */
  @Get()
  findAll() {
    return this.adminUsersService.findAll();
  }

  /**
   * Admin đang đăng nhập tự đổi password.
   * Phải đặt trước các route động khi cần.
   */
  @Patch('me/password')
  changePassword(
    @Req()
    request: AuthenticatedAdminRequest,

    @Body()
    dto: ChangeAdminPasswordDto,
  ) {
    return this.adminUsersService.changePassword(request.user.id, dto);
  }

  /**
   * Lấy chi tiết một admin.
   */
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
  ) {
    return this.adminUsersService.findOne(id);
  }

  /**
   * Chỉ sửa fullName và email.
   */
  @Patch(':id/profile')
  updateProfile(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,

    @Body()
    dto: UpdateAdminUserProfileDto,
  ) {
    return this.adminUsersService.updateProfile(id, dto);
  }

  /**
   * Owner/Super Admin reset password
   * cho một admin khác.
   */
  @Patch(':id/reset-password')
  resetPassword(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,

    @Body()
    dto: ResetAdminPasswordDto,
  ) {
    return this.adminUsersService.resetPassword(id, dto);
  }

  /**
   * Đổi role riêng.
   */
  @Patch(':id/role')
  updateRole(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,

    @Body()
    dto: UpdateAdminUserRoleDto,
  ) {
    return this.adminUsersService.updateRole(id, dto);
  }

  /**
   * Bật hoặc tắt tài khoản.
   */
  @Patch(':id/active')
  updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,

    @Body()
    dto: UpdateAdminUserStatusDto,
  ) {
    return this.adminUsersService.updateStatus(id, dto);
  }
}
