/*
  Warnings:

  - A unique constraint covering the columns `[three_d_secure_id]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF', 'CUSTOMER', 'API_USER');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('CREATE_PAYMENT', 'READ_PAYMENT', 'UPDATE_PAYMENT', 'DELETE_PAYMENT', 'REFUND_PAYMENT', 'MANAGE_WEBHOOKS', 'VIEW_ANALYTICS', 'MANAGE_API_KEYS', 'MANAGE_USERS', 'ADMIN_ACCESS');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('STRIPE', 'PAYPAL', 'RAZORPAY', 'SIMULATOR');

-- CreateEnum
CREATE TYPE "ThreeDSecureStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'AUTHENTICATED', 'FAILED', 'ATTEMPTED');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "gateway" "PaymentGateway" NOT NULL DEFAULT 'SIMULATOR',
ADD COLUMN     "three_d_secure_id" TEXT;

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "permissions" "Permission"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "replaced_by" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "three_d_secure" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT,
    "status" "ThreeDSecureStatus" NOT NULL,
    "authentication_url" TEXT,
    "eci" TEXT,
    "cavv" TEXT,
    "xid" TEXT,
    "version" TEXT NOT NULL DEFAULT '2.0',
    "attempted_at" TIMESTAMP(3),
    "authenticated_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "three_d_secure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_configs" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "api_key" TEXT NOT NULL,
    "api_secret" TEXT NOT NULL,
    "webhook_secret" TEXT,
    "config" JSONB NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_store" (
    "id" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_data" JSONB NOT NULL,
    "event_metadata" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "causation_id" TEXT,
    "correlation_id" TEXT,

    CONSTRAINT "event_store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circuit_breaker_state" (
    "id" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'CLOSED',
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "last_failure_at" TIMESTAMP(3),
    "last_success_at" TIMESTAMP(3),
    "next_attempt_at" TIMESTAMP(3),
    "metadata" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circuit_breaker_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "three_d_secure_transaction_id_key" ON "three_d_secure"("transaction_id");

-- CreateIndex
CREATE INDEX "gateway_configs_merchant_id_is_active_idx" ON "gateway_configs"("merchant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_configs_merchant_id_gateway_key" ON "gateway_configs"("merchant_id", "gateway");

-- CreateIndex
CREATE INDEX "event_store_aggregate_id_aggregate_type_idx" ON "event_store"("aggregate_id", "aggregate_type");

-- CreateIndex
CREATE INDEX "event_store_aggregate_type_timestamp_idx" ON "event_store"("aggregate_type", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "event_store_event_type_idx" ON "event_store"("event_type");

-- CreateIndex
CREATE UNIQUE INDEX "circuit_breaker_state_service_name_key" ON "circuit_breaker_state"("service_name");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_three_d_secure_id_key" ON "transactions"("three_d_secure_id");

-- CreateIndex
CREATE INDEX "transactions_gateway_idx" ON "transactions"("gateway");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_three_d_secure_id_fkey" FOREIGN KEY ("three_d_secure_id") REFERENCES "three_d_secure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_configs" ADD CONSTRAINT "gateway_configs_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
