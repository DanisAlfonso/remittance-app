-- CreateEnum
CREATE TYPE "VirtualIbanStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "TransferDetectionStatus" AS ENUM ('DETECTED', 'PROCESSING', 'CREDITED', 'FAILED', 'ORPHANED');

-- CreateEnum
CREATE TYPE "BalanceChangeType" AS ENUM ('INCOMING_TRANSFER', 'OUTGOING_TRANSFER', 'INTERNAL_TRANSFER', 'FEE', 'ADJUSTMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "TransactionDirection" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateEnum
CREATE TYPE "MasterTransactionStatus" AS ENUM ('DETECTED', 'ROUTED', 'FAILED', 'ORPHANED');

-- CreateTable
CREATE TABLE "virtual_ibans" (
    "id" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "country" VARCHAR(2) NOT NULL,
    "userId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "masterBankId" TEXT NOT NULL,
    "masterAccountId" TEXT NOT NULL,
    "status" "VirtualIbanStatus" NOT NULL DEFAULT 'AVAILABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "purpose" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "virtual_ibans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_iban_transfers" (
    "id" TEXT NOT NULL,
    "virtualIbanId" TEXT NOT NULL,
    "virtualIban" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "senderName" TEXT,
    "senderIban" TEXT,
    "senderBankName" TEXT,
    "description" TEXT,
    "reference" TEXT,
    "obpTransactionId" TEXT,
    "obpBankId" TEXT NOT NULL,
    "obpAccountId" TEXT NOT NULL,
    "status" "TransferDetectionStatus" NOT NULL DEFAULT 'DETECTED',
    "processedAt" TIMESTAMP(3),
    "creditedAt" TIMESTAMP(3),
    "userId" TEXT,
    "creditAmount" DECIMAL(10,2),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "obpTimestamp" TIMESTAMP(3),

    CONSTRAINT "virtual_iban_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "reservedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "availableAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "virtualIbanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "virtual_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_balance_history" (
    "id" TEXT NOT NULL,
    "virtualBalanceId" TEXT NOT NULL,
    "changeAmount" DECIMAL(10,2) NOT NULL,
    "previousBalance" DECIMAL(10,2) NOT NULL,
    "newBalance" DECIMAL(10,2) NOT NULL,
    "changeType" "BalanceChangeType" NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "virtual_balance_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_account_transactions" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "obpTransactionId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "direction" "TransactionDirection" NOT NULL,
    "counterpartyName" TEXT,
    "counterpartyIban" TEXT,
    "counterpartyBank" TEXT,
    "routedToVirtualIban" TEXT,
    "routedToUserId" TEXT,
    "status" "MasterTransactionStatus" NOT NULL DEFAULT 'DETECTED',
    "processedAt" TIMESTAMP(3),
    "description" TEXT,
    "reference" TEXT,
    "obpTimestamp" TIMESTAMP(3) NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_account_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "virtual_ibans_iban_key" ON "virtual_ibans"("iban");

-- CreateIndex
CREATE INDEX "virtual_ibans_iban_idx" ON "virtual_ibans"("iban");

-- CreateIndex
CREATE INDEX "virtual_ibans_userId_idx" ON "virtual_ibans"("userId");

-- CreateIndex
CREATE INDEX "virtual_ibans_currency_status_idx" ON "virtual_ibans"("currency", "status");

-- CreateIndex
CREATE INDEX "virtual_ibans_masterBankId_masterAccountId_idx" ON "virtual_ibans"("masterBankId", "masterAccountId");

-- CreateIndex
CREATE INDEX "virtual_ibans_status_isActive_idx" ON "virtual_ibans"("status", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_iban_transfers_obpTransactionId_key" ON "virtual_iban_transfers"("obpTransactionId");

-- CreateIndex
CREATE INDEX "virtual_iban_transfers_virtualIban_idx" ON "virtual_iban_transfers"("virtualIban");

-- CreateIndex
CREATE INDEX "virtual_iban_transfers_obpTransactionId_idx" ON "virtual_iban_transfers"("obpTransactionId");

-- CreateIndex
CREATE INDEX "virtual_iban_transfers_status_detectedAt_idx" ON "virtual_iban_transfers"("status", "detectedAt");

-- CreateIndex
CREATE INDEX "virtual_iban_transfers_userId_creditedAt_idx" ON "virtual_iban_transfers"("userId", "creditedAt");

-- CreateIndex
CREATE INDEX "virtual_iban_transfers_obpBankId_obpAccountId_idx" ON "virtual_iban_transfers"("obpBankId", "obpAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_balances_virtualIbanId_key" ON "virtual_balances"("virtualIbanId");

-- CreateIndex
CREATE INDEX "virtual_balances_userId_idx" ON "virtual_balances"("userId");

-- CreateIndex
CREATE INDEX "virtual_balances_currency_idx" ON "virtual_balances"("currency");

-- CreateIndex
CREATE INDEX "virtual_balances_virtualIbanId_idx" ON "virtual_balances"("virtualIbanId");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_balances_userId_currency_key" ON "virtual_balances"("userId", "currency");

-- CreateIndex
CREATE INDEX "virtual_balance_history_virtualBalanceId_createdAt_idx" ON "virtual_balance_history"("virtualBalanceId", "createdAt");

-- CreateIndex
CREATE INDEX "virtual_balance_history_referenceId_idx" ON "virtual_balance_history"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "master_account_transactions_obpTransactionId_key" ON "master_account_transactions"("obpTransactionId");

-- CreateIndex
CREATE INDEX "master_account_transactions_bankId_accountId_idx" ON "master_account_transactions"("bankId", "accountId");

-- CreateIndex
CREATE INDEX "master_account_transactions_obpTransactionId_idx" ON "master_account_transactions"("obpTransactionId");

-- CreateIndex
CREATE INDEX "master_account_transactions_routedToVirtualIban_idx" ON "master_account_transactions"("routedToVirtualIban");

-- CreateIndex
CREATE INDEX "master_account_transactions_status_detectedAt_idx" ON "master_account_transactions"("status", "detectedAt");

-- CreateIndex
CREATE INDEX "master_account_transactions_obpTimestamp_idx" ON "master_account_transactions"("obpTimestamp");

-- AddForeignKey
ALTER TABLE "virtual_ibans" ADD CONSTRAINT "virtual_ibans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_iban_transfers" ADD CONSTRAINT "virtual_iban_transfers_virtualIbanId_fkey" FOREIGN KEY ("virtualIbanId") REFERENCES "virtual_ibans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_iban_transfers" ADD CONSTRAINT "virtual_iban_transfers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_balances" ADD CONSTRAINT "virtual_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_balances" ADD CONSTRAINT "virtual_balances_virtualIbanId_fkey" FOREIGN KEY ("virtualIbanId") REFERENCES "virtual_ibans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_balance_history" ADD CONSTRAINT "virtual_balance_history_virtualBalanceId_fkey" FOREIGN KEY ("virtualBalanceId") REFERENCES "virtual_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
