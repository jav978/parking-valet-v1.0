import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponse } from './interfaces/auth-response.interface';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const permissions = user.role.rolePermissions.map((rp) => rp.permission.code);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateAuthResponse(user.id, user.email, user.role.name, permissions, {
      firstName: user.firstName,
      lastName: user.lastName,
    });
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const roleId = dto.roleId || (await this.getDefaultRoleId());

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        roleId,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const permissions = user.role.rolePermissions.map((rp) => rp.permission.code);

    return this.generateAuthResponse(user.id, user.email, user.role.name, permissions, {
      firstName: user.firstName,
      lastName: user.lastName,
    });
  }

  async refreshTokens(userId: string, _refreshToken: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const permissions = user.role.rolePermissions.map((rp) => rp.permission.code);

    return this.generateAuthResponse(user.id, user.email, user.role.name, permissions, {
      firstName: user.firstName,
      lastName: user.lastName,
    });
  }

  async logout(tokenJti: string): Promise<void> {
    await this.prisma.blacklistedToken.create({
      data: {
        tokenJti,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BusinessException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!user) {
      throw new BusinessException('User not found');
    }

    return user;
  }

  private async generateAuthResponse(
    userId: string,
    email: string,
    role: string,
    permissions: string[],
    profile: { firstName: string; lastName: string },
  ): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
      permissions,
    };

    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: jwtSecret, expiresIn: '15m' as const }),
      this.jwtService.signAsync(payload, { secret: refreshSecret, expiresIn: '7d' as const }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role,
        permissions,
      },
    };
  }

  private async getDefaultRoleId(): Promise<string> {
    const operatorRole = await this.prisma.role.findUnique({
      where: { name: 'OPERATOR' },
    });
    return operatorRole!.id;
  }
}
