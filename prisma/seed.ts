import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test merchants
  const merchant1 = await prisma.merchant.upsert({
    where: { email: 'test@merchant.com' },
    update: {},
    create: {
      name: 'Test Merchant',
      email: 'test@merchant.com',
      apiKey: 'sk_test_' + uuidv4().replace(/-/g, ''),
      apiSecret: 'secret_' + uuidv4(),
      status: 'ACTIVE',
      feeRate: 0.029,
      feeFixed: 0.30,
    },
  });

  console.log('✅ Created merchant:', merchant1.email);

  // Create test customers
  const customer1 = await prisma.customer.create({
    data: {
      merchantId: merchant1.id,
      email: 'customer1@example.com',
      name: 'John Doe',
      phone: '+1234567890',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      merchantId: merchant1.id,
      email: 'customer2@example.com',
      name: 'Jane Smith',
    },
  });

  console.log('✅ Created customers');

  // Create test transactions
  const transaction1 = await prisma.transaction.create({
    data: {
      merchantId: merchant1.id,
      customerId: customer1.id,
      amount: 1000,
      currency: 'USD',
      status: 'CAPTURED',
      type: 'PAYMENT',
      description: 'Test payment',
      authorizationCode: 'AUTH123',
      capturedAmount: 1000,
      feeAmount: 29.30,
      netAmount: 970.70,
    },
  });

  const transaction2 = await prisma.transaction.create({
    data: {
      merchantId: merchant1.id,
      customerId: customer2.id,
      amount: 2500,
      currency: 'USD',
      status: 'FAILED',
      type: 'PAYMENT',
      description: 'Failed test payment',
      errorCode: 'card_declined',
      errorMessage: 'Your card was declined',
    },
  });

  console.log('✅ Created transactions');

  // Create transaction events
  await prisma.transactionEvent.create({
    data: {
      transactionId: transaction1.id,
      eventType: 'PAYMENT_CAPTURED',
      newStatus: 'CAPTURED',
    },
  });

  await prisma.transactionEvent.create({
    data: {
      transactionId: transaction2.id,
      eventType: 'PAYMENT_FAILED',
      newStatus: 'FAILED',
    },
  });

  console.log('✅ Created transaction events');

  // Create simulator config
  await prisma.simulatorConfig.create({
    data: {
      merchantId: merchant1.id,
      defaultDelayMs: 1000,
      minDelayMs: 500,
      maxDelayMs: 2000,
      successRate: 0.85,
      failureDistribution: {
        card_declined: 0.05,
        insufficient_funds: 0.03,
        processing_error: 0.02,
        fraudulent: 0.03,
        other: 0.02,
      },
      networkSimulation: true,
      fraudDetectionEnabled: true,
    },
  });

  console.log('✅ Created simulator config');

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('Test Merchant Credentials:');
  console.log(`  Email: ${merchant1.email}`);
  console.log(`  API Key: ${merchant1.apiKey}`);
  console.log('\nUse this API key in the Authorization header:');
  console.log(`  Authorization: Bearer ${merchant1.apiKey}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
