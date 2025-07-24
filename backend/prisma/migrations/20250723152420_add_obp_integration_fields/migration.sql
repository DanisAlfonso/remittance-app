-- DropIndex
DROP INDEX "internal_transfers_amount_status_idx";

-- DropIndex
DROP INDEX "wise_accounts_balance_updated_idx";

-- DropIndex
DROP INDEX "wise_transactions_amount_created_idx";

-- DropIndex
DROP INDEX "wise_transactions_status_created_idx";

-- AlterTable
ALTER TABLE "wise_accounts" ADD COLUMN     "obpAccountId" TEXT,
ADD COLUMN     "obpBankId" TEXT;
