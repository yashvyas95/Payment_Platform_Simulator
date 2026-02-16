# Payment Platform Simulator - Architecture & Documentation

> **Version:** 1.0.0  
> **Last Updated:** February 15, 2026  
> **Status:** Production Ready

**🎯 NOTE:** This document describes the architecture and implemented features of the Payment Platform Simulator.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Core Functionalities](#core-functionalities)
3. [System Architecture](#system-architecture)
4. [Tech Stack](#tech-stack)
5. [Key Insights](#key-insights)
6. [Security Considerations](#security-considerations)
7. [API Design](#api-design)

---

## 🎯 Overview

### Purpose

The **Payment Platform Simulator** is a comprehensive testing and development environment that mimics real-world payment processing systems. It enables developers to test payment integrations, simulate various transaction scenarios, and validate payment workflows without connecting to actual payment gateways or banks.

### Key Benefits

- **Safe Testing Environment**: Test without real money or live payment credentials
- **Scenario Simulation**: Replicate success, failure, and edge cases
- **Cost-Effective**: No transaction fees during development
- **Rapid Development**: Instant feedback without network dependencies
- **Educational**: Learn payment processing without compliance risks

### Target Users

- Backend developers building payment integrations
- QA engineers testing payment flows
- Product managers validating payment features
- Students learning payment systems
- Startups prototyping payment solutions

---

## 🚀 Core Functionalities

### 1. Payment Processing Simulation

#### Transaction Types

- **Card Payments** (Credit/Debit cards)
  - Authorization (hold funds)
  - Capture (complete payment)
  - Authorization + Capture (single step)

#### Transaction Operations

```
┌─────────────────┬──────────────────────────────────────┐
│ Operation       │ Description                          │
├─────────────────┼──────────────────────────────────────┤
│ Authorize       │ Hold funds without capture           │
│ Capture         │ Complete authorized payment          │
│ Auth + Capture  │ Single-step payment                  │
│ Refund          │ Return funds (full or partial)       │
│ Void            │ Cancel before settlement             │
│ Chargeback      │ Simulate dispute process             │
└─────────────────┴──────────────────────────────────────┘
```

### 2. Response Scenarios

#### Success Scenarios

- **Immediate Approval**: Instant transaction approval (200ms delay)
- **Delayed Approval**: Realistic processing time (1-3s delay)
- **Partial Authorization**: Approve for less than requested amount

#### Failure Scenarios

```
┌──────────────────────────┬──────────┬─────────────────────────┐
│ Scenario                 │ Code     │ Description             │
├──────────────────────────┼──────────┼─────────────────────────┤
│ Insufficient Funds       │ 51       │ Not enough balance      │
│ Card Declined            │ 05       │ Generic decline         │
│ Expired Card             │ 54       │ Card past expiry        │
│ Invalid Card Number      │ 14       │ Invalid PAN             │
│ Network Timeout          │ 68       │ Connection timeout      │
│ Gateway Error            │ 96       │ System malfunction      │
│ Fraud Detected           │ 59       │ Suspected fraud         │
│ Limit Exceeded           │ 61       │ Amount limit exceeded   │
│ Invalid CVV              │ N7       │ CVV mismatch            │
│ Stolen Card              │ 43       │ Card reported stolen    │
└──────────────────────────┴──────────┴─────────────────────────┘
```

### 3. Account & User Management

- **Merchant Accounts**
  - Registration and onboarding
  - API key generation
  - Settlement account configuration
  - Fee structure management
- **Customer Accounts**
  - Customer profile management
  - Payment method storage (tokenization)
  - Transaction history
  - Wallet balance tracking

- **Multi-Currency Support**
  - USD, EUR, GBP, JPY, INR, etc.

### 4. Webhook & Notifications

#### Webhook Events

```
payment.authorized
payment.captured
payment.failed
payment.refunded
payment.chargeback
settlement.completed
fraud.detected
```

#### Notification Channels

- Email (transaction receipts, alerts)
- SMS (OTP, confirmations) - optional
- Push notifications (mobile apps)
- Webhook POST requests
- WebSocket real-time updates

### 5. Reporting & Analytics

#### Available Reports

- Transaction history (filterable, searchable)
- Success/failure rate analytics
- Volume reports (hourly, daily, monthly)
- Revenue reports with fee breakdown
- Merchant performance dashboard
- Payment method distribution
- Geographic transaction heatmap

#### Export Options

- CSV for spreadsheet analysis
- JSON for programmatic access
- PDF for formal reporting
- Real-time API endpoints

### 6. Configuration & Control

#### Simulator Control Panel

```yaml
simulator_config:
  response_delay:
    min_ms: 500
    max_ms: 2000

  success_probability: 0.85 # 85% success rate

  failure_distribution:
    insufficient_funds: 0.05
    card_declined: 0.03
    timeout: 0.02
    fraud_detected: 0.03
    other: 0.02

  network_conditions:
    latency_simulation: true
    timeout_threshold_ms: 5000
    packet_loss_rate: 0.01
```

#### Environment Modes

- **Sandbox Mode**: Realistic simulation with random delays
- **Test Mode**: Predictable responses based on test card numbers
- **Chaos Mode**: Random failures for resilience testing
- **Replay Mode**: Replay recorded transactions

### 7. Security Features

- **Authentication**
  - API Key authentication
  - JWT token-based auth with refresh rotation
- **Data Protection**
  - Encryption in transit (TLS)
  - PAN tokenization
  - CVV never stored
- **Access Control**
  - Role-based access control (RBAC) with 5 roles and 10 permissions
  - Rate limiting (per API key)

### 8. Integration Points

#### REST API

```
POST   /v1/payments
GET    /v1/payments/:id
POST   /v1/payments/:id/capture
POST   /v1/payments/:id/refund
POST   /v1/payments/:id/void
GET    /v1/transactions
GET    /v1/merchants
POST   /v1/customers
GET    /v1/customers
GET    /v1/customers/:id
POST   /v1/webhooks
GET    /v1/webhooks
GET    /v1/simulator/config
PUT    /v1/simulator/config
POST   /v1/simulator/test
GET    /health
GET    /health/detailed
GET    /docs              (Swagger UI)
```

### 9. Testing Features

#### Test Card Numbers

```
┌─────────────────────┬────────────────────┬─────────────────┐
│ Card Number         │ Brand              │ Expected Result │
├─────────────────────┼────────────────────┼─────────────────┤
│ 4242424242424242    │ Visa               │ Success         │
│ 5555555555554444    │ Mastercard         │ Success         │
│ 378282246310005     │ American Express   │ Success         │
│ 4000000000000002    │ Visa               │ Declined        │
│ 4000000000009995    │ Visa               │ Insufficient    │
│ 4000000000000069    │ Visa               │ Expired Card    │
│ 4000000000000127    │ Visa               │ Invalid CVV     │
│ 4000000000000119    │ Visa               │ Generic Decline│
└─────────────────────┴────────────────────┴─────────────────┘
```

#### Predefined Test Scenarios

- Happy path testing
- Edge case scenarios
- Timeout simulation
- Network failure simulation
- Idempotency verification

### 10. Frontend Dashboard _(React SPA)_

The frontend dashboard provides:

- Real-time transaction feed (via WebSocket)
- Payment processing interface
- Transaction history and search
- Merchant configuration
- Simulator control panel
- Health monitoring

> **Note:** The frontend runs on port 3001 (Vite dev server) and communicates with the backend API on port 3000.

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  ┌────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ Web UI     │  │ API Client     │  │  Swagger UI  │  │
│  │ (React)    │  │ (Postman/cURL) │  │  (/docs)     │  │
│  └──────┬─────┘  └───────┬────────┘  └──────┬───────┘  │
└─────────┼────────────────┼──────────────────┼───────────┘
          │                │                  │
          └────────────────┼──────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────┐
│                   API GATEWAY LAYER (Fastify)             │
│  ┌──────────────────────────────────────────────────┐    │
│  │  JWT Auth │ RBAC │ Rate Limiting │ Request Routing│    │
│  │  CORS │ Helmet │ Request Validation              │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────┬────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────┐
│                  CORE SERVICES LAYER                      │
│                                                            │
│  ┌───────────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │   Payment     │  │  Simulator  │  │   Merchant     │ │
│  │   Service     │◄─┤   Engine    │  │   Service      │ │
│  │               │  │             │  │                │ │
│  └───────────────┘  └─────────────┘  └────────────────┘ │
│                                                            │
│  ┌───────────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │   Customer    │  │   Webhook   │  │   Transaction  │ │
│  │   Service     │  │   Service   │  │   Service      │ │
│  └───────────────┘  └─────────────┘  └────────────────┘ │
│                                                            │
│  ┌───────────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │   3D Secure   │  │   Auth      │  │   Circuit      │ │
│  │   Service     │  │   Service   │  │   Breaker      │ │
│  └───────────────┘  └─────────────┘  └────────────────┘ │
│                                                            │
│  ┌───────────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │   Event       │  │   CQRS      │  │   WebSocket    │ │
│  │   Store       │  │   Service   │  │   Service      │ │
│  └───────────────┘  └─────────────┘  └────────────────┘ │
└──────────────────────────┬────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────┐
│                  GATEWAY ADAPTERS                         │
│                                                            │
│  ┌───────────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │    Stripe     │  │   PayPal    │  │   Razorpay     │ │
│  │   Adapter     │  │   Adapter   │  │   Adapter      │ │
│  └───────────────┘  └─────────────┘  └────────────────┘ │
└──────────────────────────┬────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────┐
│                      DATA LAYER                           │
│                                                            │
│  ┌───────────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │  PostgreSQL   │  │    Redis    │  │   RabbitMQ     │ │
│  │  (Primary DB) │  │   (Cache)   │  │    (Queue)     │ │
│  └───────────────┘  └─────────────┘  └────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Component Details

#### 1. API Gateway

**Responsibilities:**

- Request authentication and authorization
- Rate limiting (1000 req/min per API key)
- Request/response transformation
- CORS policy enforcement
- Request logging and metrics

**Technology:** Fastify with plugins

#### 2. Payment Service

**Responsibilities:**

- Payment request orchestration
- Transaction state management
- Payment method routing
- Retry logic
- Webhook triggering

**Key Flows:**

```
Authorization Flow:
Client → API Gateway → Payment Service → Gateway Adapter → Simulator Engine
→ Response → Payment Service → Database → Webhook Queue → Client

Capture Flow:
Client → API Gateway → Payment Service → Check Authorization
→ Update State → Webhook → Client
```

#### 3. Simulator Engine

**Responsibilities:**

- Response generation based on configuration
- Delay simulation
- Error scenario injection
- Test card number interpretation
- Network condition simulation

**Configuration:**

```json
{
  "defaultDelay": 1000,
  "scenarios": [
    { "trigger": "4242424242424242", "response": "success" },
    { "trigger": "4000000000000002", "response": "declined" },
    { "trigger": "amount > 10000", "response": "fraud_check" }
  ]
}
```

#### 4. Gateway Adapters

The platform uses an adapter pattern to simulate multiple payment gateways:

**Stripe Adapter:**

- Stripe-like API request/response format
- Test card number mapping
- Authorization and capture flows

**PayPal Adapter:**

- PayPal-style order processing
- Test card failure scenarios

**Razorpay Adapter:**

- Razorpay-style payment processing
- INR-focused test scenarios

> All adapters share the same test card mappings to ensure consistent behavior regardless of selected gateway.

### Data Model

#### Core Entities

```sql
-- Merchants
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL, -- active, suspended, pending
    fee_rate DECIMAL(5,4) DEFAULT 0.0290, -- 2.9%
    fee_fixed DECIMAL(10,2) DEFAULT 0.30,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id),
    email VARCHAR(255),
    name VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payment Methods
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    type VARCHAR(20) NOT NULL, -- card, bank_account, wallet
    token VARCHAR(255) NOT NULL, -- tokenized data
    last4 VARCHAR(4),
    brand VARCHAR(50),
    exp_month INTEGER,
    exp_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id),
    customer_id UUID REFERENCES customers(id),
    payment_method_id UUID REFERENCES payment_methods(id),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL, -- pending, authorized, captured, failed, refunded
    type VARCHAR(20) NOT NULL, -- payment, refund, chargeback
    description TEXT,
    metadata JSONB,
    error_code VARCHAR(10),
    error_message TEXT,
    authorization_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transaction Events (Audit Log)
CREATE TABLE transaction_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    event_type VARCHAR(50) NOT NULL, -- authorized, captured, failed, refunded
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Settlements
CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id),
    settlement_date DATE NOT NULL,
    gross_amount DECIMAL(12,2) NOT NULL,
    fee_amount DECIMAL(12,2) NOT NULL,
    net_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL, -- pending, completed, failed
    transaction_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Webhooks
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id),
    url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL, -- array of event types
    secret VARCHAR(64) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Webhook Deliveries
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID REFERENCES webhooks(id),
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL, -- pending, delivered, failed
    http_status INTEGER,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### API Flow Examples

#### 1. Create Payment (Authorization + Capture)

```http
POST /v1/payments
Authorization: Bearer sk_test_xxxxx
Content-Type: application/json

{
  "amount": 1000,
  "currency": "USD",
  "payment_method": {
    "type": "card",
    "card": {
      "number": "4242424242424242",
      "exp_month": 12,
      "exp_year": 2027,
      "cvv": "123"
    }
  },
  "customer": "cus_xxxxx",
  "description": "Order #1234",
  "capture": true
}
```

**Response:**

```json
{
  "id": "pay_xxxxx",
  "object": "payment",
  "amount": 1000,
  "currency": "USD",
  "status": "succeeded",
  "payment_method": {
    "id": "pm_xxxxx",
    "type": "card",
    "card": {
      "brand": "visa",
      "last4": "4242",
      "exp_month": 12,
      "exp_year": 2027
    }
  },
  "created": 1708041600,
  "authorization_code": "ABC123"
}
```

#### 2. Handle Failed Payment

```http
POST /v1/payments
Authorization: Bearer sk_test_xxxxx
Content-Type: application/json

{
  "amount": 5000,
  "currency": "USD",
  "payment_method": {
    "type": "card",
    "card": {
      "number": "4000000000000002",
      "exp_month": 12,
      "exp_year": 2027,
      "cvv": "123"
    }
  }
}
```

**Response:**

```json
{
  "id": "pay_xxxxx",
  "object": "payment",
  "amount": 5000,
  "currency": "USD",
  "status": "failed",
  "error": {
    "code": "card_declined",
    "message": "Your card was declined.",
    "decline_code": "generic_decline"
  },
  "created": 1708041600
}
```

---

## 💻 Tech Stack

### Backend

**Framework:** Node.js with TypeScript

- Runtime: Node.js 20 LTS
- Language: TypeScript 5.3+
- Framework: Fastify 4.x (high performance, schema validation)

**Why This Stack?**

- ✅ Excellent async I/O for payment processing
- ✅ Strong typing for financial data safety
- ✅ Large ecosystem for payment integrations
- ✅ Fast development cycle
- ✅ 10x faster than Express in benchmarks

### Database Layer

**Primary Database:** PostgreSQL 15+

- ACID compliance for transaction integrity
- JSONB for flexible metadata storage
- Full-text search capabilities
- Excellent performance for financial data

**Caching:** Redis 7+

- Session management
- Rate limiting counters
- Temporary transaction data
- Real-time analytics

**Message Queue:** RabbitMQ

- Webhook delivery queue
- Async notification processing
- Event-driven architecture
- Retry mechanisms

### Frontend

**Framework:** React 19 with TypeScript

- UI Library: Material-UI (MUI) 5
- State Management: Redux Toolkit
- Charts: Recharts
- Server State: TanStack React Query
- HTTP Client: Fetch / Axios
- WebSocket Client: Socket.IO Client
- Routing: React Router 7

### ORM & Database Tools

**Prisma 5.x**

- Type-safe database client
- Auto-generated TypeScript types
- Built-in migration system
- Excellent query performance

```typescript
// Example Prisma Model
model Transaction {
  id              String   @id @default(uuid())
  merchantId      String
  amount          Decimal  @db.Decimal(12, 2)
  currency        String   @default("USD")
  status          String
  authCode        String?
  createdAt       DateTime @default(now())

  merchant        Merchant @relation(fields: [merchantId], references: [id])
  events          TransactionEvent[]
}
```

### Authentication & Security

- **JWT:** jsonwebtoken
- **Password Hashing:** bcrypt
- **API Security:** Helmet.js, CORS
- **Rate Limiting:** @fastify/rate-limit
- **Validation:** Zod schemas

### Testing

- **Unit Testing:** Jest
- **Integration Testing:** Supertest
- **E2E Testing:** Playwright (optional)
- **Load Testing:** Artillery or k6
- **Test Data:** Faker.js

### DevOps & Infrastructure

**Containerization:**

- Docker
- Docker Compose (local development)

**CI/CD:**

- GitHub Actions (recommended)
- GitLab CI (alternative)

**Monitoring:**

- Logging: Pino (fast JSON logger)
- Metrics: Prometheus
- Visualization: Grafana
- Error Tracking: Sentry

**Cloud Deployment Options:**

- AWS (ECS Fargate, RDS, ElastiCache)
- DigitalOcean (cost-effective)
- Heroku (quick deployment)
- Azure or GCP (enterprise)

### Development Tools

```json
{
  "editor": "VS Code",
  "extensions": ["Prisma", "ESLint", "Prettier", "Docker", "GitLens"],
  "packageManager": "npm or pnpm",
  "nodeVersion": "20.x LTS"
}
```

---

## 💡 Key Insights

### 1. Idempotency is Critical

**Problem:** Client retries can cause duplicate charges.

**Solution:** Implement idempotency keys.

```typescript
// API usage
POST /v1/payments
Idempotency-Key: uuid-xxxxx

// Server-side check
if (await redis.exists(`idempotency:${key}`)) {
  return cachedResponse;
}
```

### 2. Transaction State Machine

```
pending → authorized → captured → settled
          ↓           ↓
        failed      refunded
                      ↓
                   settled
```

**Key Rules:**

- Can't capture without authorization
- Can't refund uncaptured payments
- Can void only before capture
- State transitions must be atomic

### 3. Money Representation

**❌ Wrong:**

```javascript
const amount = 19.99; // Floating point issues
```

**✅ Correct:**

```javascript
const amount = 1999; // Store as cents (integer)
// OR
import Decimal from 'decimal.js';
const amount = new Decimal('19.99');
```

### 4. Async Processing

**Synchronous (Fast):**

- Payment authorization
- Card validation
- Immediate failures

**Asynchronous (Queue):**

- Webhook delivery
- Email notifications
- Settlement processing
- Report generation

### 5. Security Best Practices

```typescript
// Never log sensitive data
logger.info({
  transactionId: tx.id,
  amount: tx.amount,
  // ❌ card: tx.card,  // Never log full card
  last4: tx.card.last4, // ✅ Only last 4 digits
});

// Always use parameterized queries
await db.query('SELECT * FROM transactions WHERE id = $1', [transactionId]);

// Encrypt sensitive data
const encrypted = encrypt(cardNumber, AES_KEY);
await db.save({ cardToken: encrypted });
```

### 6. Rate Limiting Strategy

```typescript
// Per API key
{
  points: 1000,  // 1000 requests
  duration: 60   // per 60 seconds
}

// Per IP (unauthenticated)
{
  points: 100,
  duration: 60
}

// Burst protection
{
  points: 10,
  duration: 1    // max 10 req per second
}
```

### 7. Webhook Reliability

**Delivery Strategy:**

- Initial attempt: Immediate
- Retry 1: After 1 minute
- Retry 2: After 5 minutes
- Retry 3: After 30 minutes
- Retry 4: After 2 hours
- Retry 5: After 24 hours

**Verification:**

```typescript
// Sign webhook payload
const signature = hmac(payload, webhookSecret);

// Client verification
if (receivedSignature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

### 8. Testing with Deterministic Results

```typescript
// Test card numbers determine outcomes
const TEST_CARDS = {
  SUCCESS: '4242424242424242',
  DECLINE: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
  TIMEOUT: '4000000000006975',
  FRAUD: '4100000000000019',
};

// Amount-based triggers
if (amount === 0) return 'INVALID_AMOUNT';
if (amount < 100) return 'BELOW_MINIMUM';
if (amount > 999999) return 'ABOVE_MAXIMUM';
```

### 9. Database Performance

**Indexes Required:**

```sql
CREATE INDEX idx_transactions_merchant ON transactions(merchant_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_transactions_lookup ON transactions(merchant_id, created_at DESC);
```

**Query Optimization:**

```sql
-- ❌ Slow: Full table scan
SELECT * FROM transactions WHERE created_at > NOW() - INTERVAL '30 days';

-- ✅ Fast: Index-optimized with LIMIT
SELECT * FROM transactions
WHERE merchant_id = $1
  AND created_at > $2
ORDER BY created_at DESC
LIMIT 100;
```

### 10. Error Handling Hierarchy

```
1. Validation Errors (400)
   - Invalid input format
   - Missing required fields

2. Authentication Errors (401)
   - Invalid API key
   - Expired token

3. Authorization Errors (403)
   - Insufficient permissions
   - Merchant suspended

4. Business Logic Errors (402/422)
   - Insufficient funds
   - Card declined

5. Server Errors (500)
   - Database connection failure
   - Unhandled exceptions
```

---

##  Security Considerations

### 1. Data Protection

**PCI DSS Compliance Simulation:**

- Never store full card numbers (use tokenization)
- Never store CVV
- Encrypt sensitive data at rest
- Use TLS 1.3 for data in transit

**Implementation:**

```typescript
// Tokenization
const token = generateSecureToken();
await db.paymentMethod.create({
  token: token,
  last4: cardNumber.slice(-4),
  // ❌ Never store: cardNumber, cvv
});
```

### 2. Authentication

**API Key Format:**

```
Test Key:  sk_test_xxxxxxxxxxxxxxxx
Live Key:  sk_live_xxxxxxxxxxxxxxxx
Public:    pk_test_xxxxxxxxxxxxxxxx
```

**Key Rotation:**

- Support multiple active keys
- Graceful key deprecation
- Audit log of key usage

### 3. Authorization

**Role-Based Access:**

```typescript
enum Role {
  ADMIN = 'admin', // Full access
  MERCHANT = 'merchant', // Own resources only
  DEVELOPER = 'developer', // Read-only
  SUPPORT = 'support', // Limited write
}
```

### 4. Input Validation

```typescript
import { z } from 'zod';

const PaymentSchema = z.object({
  amount: z.number().positive().max(999999),
  currency: z.enum(['USD', 'EUR', 'GBP']),
  card: z.object({
    number: z.string().regex(/^\d{13,19}$/),
    expMonth: z.number().min(1).max(12),
    expYear: z.number().min(2026),
    cvv: z.string().regex(/^\d{3,4}$/),
  }),
});
```

### 5. Rate Limiting

```typescript
// Progressive rate limiting
const limits = {
  tier1: { requests: 100, window: '1m' }, // Free tier
  tier2: { requests: 1000, window: '1m' }, // Paid tier
  tier3: { requests: 10000, window: '1m' }, // Enterprise
};
```

### 6. Logging & Monitoring

**What to Log:**

- ✅ Request metadata (IP, user agent, timestamp)
- ✅ Transaction IDs
- ✅ Status changes
- ✅ Error codes
- ❌ Never log: card numbers, CVV, passwords, API keys

**Monitoring Alerts:**

- High failure rate (>10%)
- Unusual transaction volume
- Multiple failed auth attempts
- Database connection failures
- API response time >2s

---

## 🔌 API Design

### RESTful Endpoints

```
┌─────────────────────────────┬────────┬──────────────────────────┐
│ Endpoint                    │ Method │ Description              │
├─────────────────────────────┼────────┼──────────────────────────┤
│ /v1/payments                │ POST   │ Create payment           │
│ /v1/payments/:id            │ GET    │ Retrieve payment         │
│ /v1/payments/:id/capture    │ POST   │ Capture authorization    │
│ /v1/payments/:id/refund     │ POST   │ Refund payment           │
│ /v1/payments/:id/void       │ POST   │ Void authorization       │
│ /v1/transactions            │ GET    │ List transactions        │
│ /v1/customers               │ POST   │ Create customer          │
│ /v1/customers               │ GET    │ List customers           │
│ /v1/customers/:id           │ GET    │ Retrieve customer        │
│ /v1/merchants               │ GET    │ Get merchant details     │
│ /v1/webhooks                │ POST   │ Create webhook endpoint  │
│ /v1/webhooks                │ GET    │ List webhooks            │
│ /v1/simulator/config        │ GET    │ Get simulator config     │
│ /v1/simulator/config        │ PUT    │ Update simulator config  │
│ /v1/simulator/test          │ POST   │ Run simulator test       │
│ /health                     │ GET    │ Health check             │
│ /health/detailed            │ GET    │ Detailed health check    │
│ /docs                       │ GET    │ Swagger UI               │
└─────────────────────────────┴────────┴──────────────────────────┘
```

### Response Format

**Success Response:**

```json
{
  "success": true,
  "data": {
    "id": "pay_xxxxx",
    "amount": 1000,
    "currency": "USD",
    "status": "succeeded"
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "card_declined",
    "message": "Your card was declined.",
    "details": {
      "decline_code": "insufficient_funds",
      "transaction_id": "tx_xxxxx"
    }
  }
}
```

### Pagination

```http
GET /v1/transactions?page=1&limit=20&sort=created_at:desc

Response:
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Filtering

```http
GET /v1/transactions?status=succeeded&amount[gte]=1000&created_at[gte]=2026-01-01
```

---

## 📚 Additional Resources

### Documentation

- **API Reference**: Available at `/docs` (Swagger UI) when server is running
- **Quick Start**: See [QUICKSTART.md](./QUICKSTART.md)
- **Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

### Support

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and community support

---

## 📝 License

MIT License - Free to use for educational and commercial purposes.

---

**Document Version:** 1.0.0  
**Last Updated:** February 15, 2026  
**Status:** ✅ v1.0 Released
