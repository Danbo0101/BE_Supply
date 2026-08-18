import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SignOptions } from 'jsonwebtoken';
import { AdminUsersService } from '../admin-users/admin-users.service';
import { AdminUser } from '../admin-users/entities/admin-user.entity';
import { AdminLoginDto } from './dto/admin-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

type TokenPayload = {
  sub: string;
  email: string;
  role: string;
};

type DecodedToken = {
  exp?: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async adminLogin(adminLoginDto: AdminLoginDto) {
    const email = adminLoginDto.email.trim().toLowerCase();

    const adminUser = await this.adminUsersService.findByEmail(email);

    if (!adminUser) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!adminUser.isActive) {
      throw new UnauthorizedException('Admin user is inactive');
    }

    const isPasswordValid = await bcrypt.compare(
      adminLoginDto.password,
      adminUser.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(adminUser);

    await this.saveRefreshToken(
      adminUser.id,
      tokens.refreshToken,
      tokens.refreshTokenExpiresAt,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      adminUser: this.adminUsersService.toAdminUserResponse(adminUser),
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const refreshToken = refreshTokenDto.refreshToken?.trim();

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!refreshSecret) {
      throw new InternalServerErrorException(
        'JWT refresh secret is not configured',
      );
    }

    let payload: TokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<TokenPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const adminUser = await this.adminUsersService.findRawById(payload.sub);

    if (!adminUser) {
      throw new UnauthorizedException('Admin user not found');
    }

    if (!adminUser.isActive) {
      throw new UnauthorizedException('Admin user is inactive');
    }

    if (!adminUser.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (
      !adminUser.refreshTokenExpiresAt ||
      adminUser.refreshTokenExpiresAt.getTime() <= Date.now()
    ) {
      await this.adminUsersService.updateRefreshToken(adminUser.id, null, null);

      throw new UnauthorizedException('Refresh token expired');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      adminUser.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Refresh-token rotation:
    // tạo cặp token mới và thay refresh token cũ trong database.
    const tokens = await this.generateTokens(adminUser);

    await this.saveRefreshToken(
      adminUser.id,
      tokens.refreshToken,
      tokens.refreshTokenExpiresAt,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      adminUser: this.adminUsersService.toAdminUserResponse(adminUser),
    };
  }

  async logout(adminUser: AdminUser) {
    await this.adminUsersService.updateRefreshToken(adminUser.id, null, null);

    return {
      message: 'Logged out successfully',
    };
  }

  async getAdminProfile(adminUser: AdminUser) {
    // Lấy lại từ database để profile, role và isActive luôn là dữ liệu mới.
    return this.adminUsersService.findOne(adminUser.id);
  }

  private async saveRefreshToken(
    adminUserId: string,
    refreshToken: string,
    refreshTokenExpiresAt: Date,
  ) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.adminUsersService.updateRefreshToken(
      adminUserId,
      refreshTokenHash,
      refreshTokenExpiresAt,
    );
  }

  private async generateTokens(adminUser: AdminUser) {
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret || !refreshSecret) {
      throw new InternalServerErrorException('JWT secrets are not configured');
    }

    const accessTokenExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';

    const refreshTokenExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    const payload: TokenPayload = {
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessTokenExpiresIn as SignOptions['expiresIn'],
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshTokenExpiresIn as SignOptions['expiresIn'],
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: this.getTokenExpiresAt(accessToken),
      refreshTokenExpiresAt: this.getTokenExpiresAt(refreshToken),
    };
  }

  private getTokenExpiresAt(token: string) {
    const decodedToken = this.jwtService.decode<DecodedToken>(token);

    if (!decodedToken?.exp) {
      throw new InternalServerErrorException(
        'Unable to determine token expiration',
      );
    }

    return new Date(decodedToken.exp * 1000);
  }
}
