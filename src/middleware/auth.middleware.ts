import { FastifyRequest, FastifyReply } from 'fastify';
import { getPrisma } from '../config/database';

export async function authenticateRequest(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing authorization header',
        },
      });
    }

    // Extract API key from Bearer token
    const apiKey = authHeader.replace('Bearer ', '').trim();

    if (!apiKey) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid authorization format',
        },
      });
    }

    // Verify API key
    const prisma = getPrisma();
    const merchant = await prisma.merchant.findUnique({
      where: { apiKey },
      select: { id: true, status: true },
    });

    if (!merchant) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
        },
      });
    }

    if (merchant.status !== 'ACTIVE') {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'MERCHANT_SUSPENDED',
          message: 'Merchant account is not active',
        },
      });
    }

    // Attach merchant info to request
    request.user = {
      merchantId: merchant.id,
      apiKey,
    };
  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Failed to authenticate request',
      },
    });
  }
}
