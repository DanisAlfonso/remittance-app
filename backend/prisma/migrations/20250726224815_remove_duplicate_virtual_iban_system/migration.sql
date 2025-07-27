/*
  Warnings:

  - You are about to drop the `master_account_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `virtual_balance_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `virtual_balances` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `virtual_iban_transfers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `virtual_ibans` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "virtual_balance_history" DROP CONSTRAINT "virtual_balance_history_virtualBalanceId_fkey";

-- DropForeignKey
ALTER TABLE "virtual_balances" DROP CONSTRAINT "virtual_balances_userId_fkey";

-- DropForeignKey
ALTER TABLE "virtual_balances" DROP CONSTRAINT "virtual_balances_virtualIbanId_fkey";

-- DropForeignKey
ALTER TABLE "virtual_iban_transfers" DROP CONSTRAINT "virtual_iban_transfers_userId_fkey";

-- DropForeignKey
ALTER TABLE "virtual_iban_transfers" DROP CONSTRAINT "virtual_iban_transfers_virtualIbanId_fkey";

-- DropForeignKey
ALTER TABLE "virtual_ibans" DROP CONSTRAINT "virtual_ibans_userId_fkey";

-- DropTable
DROP TABLE "master_account_transactions";

-- DropTable
DROP TABLE "virtual_balance_history";

-- DropTable
DROP TABLE "virtual_balances";

-- DropTable
DROP TABLE "virtual_iban_transfers";

-- DropTable
DROP TABLE "virtual_ibans";

-- DropEnum
DROP TYPE "BalanceChangeType";

-- DropEnum
DROP TYPE "MasterTransactionStatus";

-- DropEnum
DROP TYPE "TransactionDirection";

-- DropEnum
DROP TYPE "TransferDetectionStatus";

-- DropEnum
DROP TYPE "VirtualIbanStatus";
