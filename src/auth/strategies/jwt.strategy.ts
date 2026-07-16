import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminUsersService } from '../../admin-users/admin-users.service';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

const cookieExtractor = (request: Request): string | null => {
  return request?.cookies?.access_token ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly adminUsersService: AdminUsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') ?? '',
    });
  }

  async validate(payload: JwtPayload) {
    const adminUser = await this.adminUsersService.findRawById(payload.sub);

    if (!adminUser || !adminUser.isActive) {
      throw new UnauthorizedException('Unauthorized');
    }

    return adminUser;
  }
}
