import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getPrisma } from '../../config/database';
import { logger } from '../../utils/logger';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRotation {
  token: string;
  expiresAt: Date;
}

export class AuthService {
  private readonly refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days

  async registerUser(data: {
    email: string;
    password: string;
    fullName: string;
    merchantId?: string;
    role?: string;
  }) {
    const prisma = getPrisma();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        merchantId: data.merchantId,
        role: (data.role as any) || 'CUSTOMER',
        permissions: data.role === 'ADMIN' ? ['ADMIN_ACCESS'] : ['READ_PAYMENT', 'CREATE_PAYMENT'],
      },
    });

    logger.info(`User registered: ${user.email}`);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  async login(
    email: string,
    password: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<TokenPair> {
    const prisma = getPrisma();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate token pair
    const tokenPair = await this.generateTokenPair(
      user.id,
      user.email,
      user.role,
      user.permissions,
      userAgent,
      ipAddress
    );

    logger.info(`User logged in: ${user.email}`);

    return tokenPair;
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    const prisma = getPrisma();

    // Find refresh token
    const token = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!token) {
      throw new Error('Invalid refresh token');
    }

    // Check if revoked
    if (token.revokedAt) {
      throw new Error('Refresh token has been revoked');
    }

    // Check if expired
    if (new Date() > token.expiresAt) {
      throw new Error('Refresh token expired');
    }

    // Check if user is still active
    if (!token.user.isActive) {
      throw new Error('User account is inactive');
    }

    // Revoke old refresh token (rotation)
    await prisma.refreshToken.update({
      where: { id: token.id },
      data: { revokedAt: new Date() },
    });

    // Generate new token pair
    const newTokenPair = await this.generateTokenPair(
      token.user.id,
      token.user.email,
      token.user.role,
      token.user.permissions,
      token.userAgent ?? undefined,
      (token.ipAddress ?? undefined) as string | undefined
    );

    // Set the replacedBy reference
    await prisma.refreshToken.update({
      where: { id: token.id },
      data: { replacedBy: newTokenPair.refreshToken },
    });

    logger.info(`Refresh token rotated for user: ${token.user.email}`);

    return newTokenPair;
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const prisma = getPrisma();

    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });

    logger.info('Refresh token revoked');
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const prisma = getPrisma();

    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    logger.info(`All tokens revoked for user: ${userId}`);
  }

  private async generateTokenPair(
    userId: string,
    email: string,
    role: string,
    permissions: any[],
    userAgent?: string,
    ipAddress?: string | undefined
  ): Promise<TokenPair> {
    const prisma = getPrisma();

    // Generate access token (JWT - simplified, use fastify JWT)
    const accessToken = Buffer.from(
      JSON.stringify({
        userId,
        email,
        role,
        permissions,
        exp: Date.now() + 15 * 60 * 1000, // 15 minutes
      })
    ).toString('base64');

    // Generate refresh token
    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiry);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // seconds
    };
  }

  async cleanupExpiredTokens(): Promise<number> {
    const prisma = getPrisma();

    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    logger.info(`Cleaned up ${result.count} expired refresh tokens`);

    return result.count;
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { permissions: true, role: true },
    });

    if (!user) {
      return false;
    }

    // Admin has all permissions
    if (user.role === 'ADMIN') {
      return true;
    }

    return user.permissions.includes(permission as any);
  }
}

export const authService = new AuthService();
