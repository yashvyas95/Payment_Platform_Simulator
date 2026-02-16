import 'fastify';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  merchantId?: string;
  apiKey?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}
