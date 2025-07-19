-- CreateEnum
CREATE TYPE "KYCStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'EXCHANGE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "WiseAccountStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "WiseTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'FEE', 'EXCHANGE');

-- CreateEnum
CREATE TYPE "WiseTransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InternalTransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT,
    "username" TEXT,
    "displayName" TEXT,
    "isSearchable" BOOLEAN NOT NULL DEFAULT true,
    "kycStatus" "KYCStatus" NOT NULL DEFAULT 'PENDING',
    "kycSubmittedAt" TIMESTAMP(3),
    "kycApprovedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "exchangeRate" DECIMAL(10,6),
    "targetAmount" DECIMAL(10,2),
    "targetCurrency" VARCHAR(3),
    "platformFee" DECIMAL(10,2),
    "providerFee" DECIMAL(10,2),
    "totalFee" DECIMAL(10,2),
    "referenceNumber" TEXT,
    "providerReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "beneficiaryId" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT,
    "accountNumber" TEXT NOT NULL,
    "accountType" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "postalCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wise_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wiseAccountId" INTEGER NOT NULL,
    "wiseProfileId" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "country" VARCHAR(2) NOT NULL,
    "accountType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "iban" TEXT,
    "accountNumber" TEXT,
    "sortCode" TEXT,
    "routingNumber" TEXT,
    "bic" TEXT,
    "bankName" TEXT,
    "bankAddress" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "lastBalance" DECIMAL(10,2),
    "balanceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wise_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wise_transactions" (
    "id" TEXT NOT NULL,
    "wiseAccountId" TEXT NOT NULL,
    "wiseTransactionId" INTEGER,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "exchangeRate" DECIMAL(10,6),
    "targetAmount" DECIMAL(10,2),
    "targetCurrency" VARCHAR(3),
    "fee" DECIMAL(10,2),
    "reference" TEXT,
    "description" TEXT,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "recipientIban" TEXT,
    "recipientAccountNumber" TEXT,
    "recipientBankName" TEXT,
    "recipientCountry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "wise_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_transfers" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "platformFee" DECIMAL(10,2),
    "note" TEXT,
    "reference" TEXT NOT NULL,
    "status" "InternalTransferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "internal_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_firstName_idx" ON "users"("firstName");

-- CreateIndex
CREATE INDEX "users_lastName_idx" ON "users"("lastName");

-- CreateIndex
CREATE INDEX "users_displayName_idx" ON "users"("displayName");

-- CreateIndex
CREATE INDEX "users_isSearchable_isActive_idx" ON "users"("isSearchable", "isActive");

-- CreateIndex
CREATE INDEX "users_firstName_lastName_idx" ON "users"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_referenceNumber_key" ON "transactions"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "wise_accounts_wiseAccountId_key" ON "wise_accounts"("wiseAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "internal_transfers_reference_key" ON "internal_transfers"("reference");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wise_accounts" ADD CONSTRAINT "wise_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wise_transactions" ADD CONSTRAINT "wise_transactions_wiseAccountId_fkey" FOREIGN KEY ("wiseAccountId") REFERENCES "wise_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_transfers" ADD CONSTRAINT "internal_transfers_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_transfers" ADD CONSTRAINT "internal_transfers_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
