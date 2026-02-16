export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    url:
      process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/payment_simulator',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10), // 1 minute
  },
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3002',
  },
  simulator: {
    defaultDelayMs: parseInt(process.env.SIMULATOR_DEFAULT_DELAY_MS || '1000', 10),
    successRate: parseFloat(process.env.SIMULATOR_SUCCESS_RATE || '0.85'),
  },
  webhook: {
    retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '5', 10),
    retryDelayMs: parseInt(process.env.WEBHOOK_RETRY_DELAY_MS || '60000', 10),
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key',
  },
};
