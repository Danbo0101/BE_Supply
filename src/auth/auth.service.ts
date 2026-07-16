import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminUsersService } from '../admin-users/admin-users.service';
import { AdminUser } from '../admin-users/entities/admin-user.entity';
import { AdminLoginDto } from './dto/admin-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignOptions } from 'jsonwebtoken';

type TokenPayload = {
  sub: string;
  email: string;
  role: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async adminLogin(adminLoginDto: AdminLoginDto) {
    const adminUser = await this.adminUsersService.findByEmail(
      adminLoginDto.email,
    );

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
    if (!refreshTokenDto.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(
        refreshTokenDto.refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      const adminUser = await this.adminUsersService.findRawById(payload.sub);

      if (!adminUser || !adminUser.isActive || !adminUser.refreshTokenHash) {
        throw new UnauthorizedException('Unauthorized');
      }

      if (
        adminUser.refreshTokenExpiresAt &&
        adminUser.refreshTokenExpiresAt.getTime() < Date.now()
      ) {
        await this.adminUsersService.updateRefreshToken(
          adminUser.id,
          null,
          null,
        );

        throw new UnauthorizedException('Refresh token expired');
      }

      const isRefreshTokenValid = await bcrypt.compare(
        refreshTokenDto.refreshToken,
        adminUser.refreshTokenHash,
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
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
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(adminUser: AdminUser) {
    await this.adminUsersService.updateRefreshToken(adminUser.id, null, null);

    return {
      message: 'Logged out successfully',
    };
  }

  async getAdminProfile(adminUser: AdminUser) {
    return this.adminUsersService.toAdminUserResponse(adminUser);
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
      accessTokenExpiresAt: this.getExpiresAt(accessTokenExpiresIn),
      refreshTokenExpiresAt: this.getExpiresAt(refreshTokenExpiresIn),
    };
  }

  private getExpiresAt(expiresIn: string) {
    const value = Number.parseInt(expiresIn, 10);
    const unit = expiresIn.replace(String(value), '');

    const now = Date.now();

    switch (unit) {
      case 's':
        return new Date(now + value * 1000);

      case 'm':
        return new Date(now + value * 60 * 1000);

      case 'h':
        return new Date(now + value * 60 * 60 * 1000);

      case 'd':
        return new Date(now + value * 24 * 60 * 60 * 1000);

      default:
        return new Date(now + value * 1000);
    }
  }
}
