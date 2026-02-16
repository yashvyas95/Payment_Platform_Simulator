import { FastifyRequest, FastifyReply } from 'fastify';
import { getPrisma } from '../config/database';

export function requireAuth() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' },
        });
      }

      // Extract token (simplified - in production use fastify-jwt)
      const token = authHeader.replace('Bearer ', '').trim();
      let decoded;

      try {
        decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      } catch {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
        });
      }

      // Check expiration
      if (decoded.exp && Date.now() > decoded.exp) {
        return reply.status(401).send({
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Token expired' },
        });
      }

      // Verify user still exists and is active
      const prisma = getPrisma();
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { isActive: true, merchantId: true },
      });

      if (!user || !user.isActive) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not found or inactive' },
        });
      }

      // Attach user to request
      request.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
        merchantId: user.merchantId || undefined,
      };
    } catch (error) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication failed' },
      });
    }
  };
}

export function requirePermission(...permissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    // Admin has all permissions
    if ((request.user as any).role === 'ADMIN') {
      return;
    }

    // Check if user has at least one of the required permissions
    const hasPermission = permissions.some((p) => (request.user as any).permissions.includes(p));

    if (!hasPermission) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Missing required permissions: ${permissions.join(', ')}`,
        },
      });
    }
  };
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    if (!roles.includes((request.user as any).role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Required role: ${roles.join(' or ')}`,
        },
      });
    }
  };
}
