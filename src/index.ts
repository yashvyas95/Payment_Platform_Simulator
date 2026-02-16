import 'dotenv/config';
import { buildServer } from './server';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { connectRabbitMQ } from './config/rabbitmq';
import { PaymentGatewayFactory } from './services/gateway/gateway.factory';
import { config } from './config';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const INSECURE_DEFAULTS = ['your-super-secret-jwt-key', 'your-32-character-encryption-key'];

function validateProductionSecrets(): void {
  if (config.server.env !== 'production') return;

  const issues: string[] = [];

  if (INSECURE_DEFAULTS.includes(config.jwt.secret)) {
    issues.push('JWT_SECRET is using default value');
  }
  if (INSECURE_DEFAULTS.includes(config.encryption.key)) {
    issues.push('ENCRYPTION_KEY is using default value');
  }
  if (config.rabbitmq.url.includes('admin:admin')) {
    issues.push('RABBITMQ_URL is using default credentials');
  }
  if (config.database.url.includes('password@')) {
    issues.push('DATABASE_URL appears to use default password');
  }

  if (issues.length > 0) {
    logger.error('Production secret validation failed:');
    issues.forEach((issue) => logger.error(`  - ${issue}`));
    throw new Error(`Refusing to start in production with insecure defaults: ${issues.join('; ')}`);
  }
}

async function start() {
  try {
    // Validate secrets before starting in production
    validateProductionSecrets();

    // Connect to external services
    logger.info('🔌 Connecting to external services...');

    await connectDatabase();
    logger.info('✅ Database connected');

    await connectRedis();
    logger.info('✅ Redis connected');

    await connectRabbitMQ();
    logger.info('✅ RabbitMQ connected');

    // Initialize payment gateways
    await PaymentGatewayFactory.initialize();
    logger.info('✅ Payment gateways initialized');

    // Build and start server
    const server = await buildServer();

    await server.listen({ port: PORT, host: HOST });

    logger.info(`🚀 Payment Platform Simulator is running!`);
    logger.info(`📡 API: http://${HOST}:${PORT}`);
    logger.info(`📚 Docs: http://${HOST}:${PORT}/docs`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`⚠️  ${signal} received, shutting down gracefully...`);
    process.exit(0);
  });
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

start();
