import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AdminUser } from '../admin-users/entities/admin-user.entity';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: AdminUser;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/login')
  async adminLogin(
    @Body() adminLoginDto: AdminLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.adminLogin(adminLoginDto);

    response.cookie(
      'access_token',
      result.accessToken,
      this.getCookieOptions(result.accessTokenExpiresAt),
    );

    response.cookie(
      'refresh_token',
      result.refreshToken,
      this.getCookieOptions(
        result.refreshTokenExpiresAt,
        '/api/v1/auth/admin/refresh',
      ),
    );

    return this.toAuthResponse(result);
  }

  @Post('admin/refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refresh({
      refreshToken: request.cookies?.refresh_token,
    });

    response.cookie(
      'access_token',
      result.accessToken,
      this.getCookieOptions(result.accessTokenExpiresAt),
    );

    response.cookie(
      'refresh_token',
      result.refreshToken,
      this.getCookieOptions(
        result.refreshTokenExpiresAt,
        '/api/v1/auth/admin/refresh',
      ),
    );

    return this.toAuthResponse(result);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/logout')
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.logout(request.user);

    response.clearCookie('access_token', {
      path: '/',
    });

    response.clearCookie('refresh_token', {
      path: '/api/v1/auth/admin/refresh',
    });

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/me')
  adminMe(@Req() request: AuthenticatedRequest) {
    return this.authService.getAdminProfile(request.user);
  }

  private getCookieOptions(expires: Date, path = '/') {
    return {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: (process.env.COOKIE_SAMESITE ?? 'lax') as
        'lax' | 'strict' | 'none',
      expires,
      path,
    };
  }

  private toAuthResponse(result: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
    adminUser: unknown;
  }) {
    return {
      adminUser: result.adminUser,
      accessTokenExpiresAt: result.accessTokenExpiresAt,
      refreshTokenExpiresAt: result.refreshTokenExpiresAt,
    };
  }
}
