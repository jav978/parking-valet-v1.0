import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/database/prisma.service';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (payload.jti) {
      const blacklisted = await this.prisma.blacklistedToken.findFirst({
        where: { tokenJti: payload.jti },
      });
      if (blacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isActive: true, activeSessionToken: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is inactive or deleted');
    }

    if (payload.sessionToken && user.activeSessionToken && payload.sessionToken !== user.activeSessionToken) {
      throw new UnauthorizedException('SESSION_EXPIRED: Tu sesión ha sido cerrada porque se inició sesión en otro dispositivo.');
    }

    return payload;
  }
}

