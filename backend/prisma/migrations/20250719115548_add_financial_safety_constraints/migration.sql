-- 🛡️ FINTECH SAFETY: Critical financial constraints to prevent data corruption

-- 🚨 CONSTRAINT: Prevent negative account balances
ALTER TABLE "wise_accounts" 
ADD CONSTRAINT "positive_balance_check" 
CHECK ("lastBalance" >= 0);

-- 🚨 CONSTRAINT: Ensure transaction amounts are non-zero
ALTER TABLE "wise_transactions" 
ADD CONSTRAINT "non_zero_amount_check" 
CHECK ("amount" != 0);

-- 🚨 CONSTRAINT: Ensure transfer amounts are positive
ALTER TABLE "internal_transfers" 
ADD CONSTRAINT "positive_transfer_amount_check" 
CHECK ("amount" > 0);

-- 🚨 CONSTRAINT: Ensure fees are non-negative
ALTER TABLE "wise_transactions" 
ADD CONSTRAINT "non_negative_fee_check" 
CHECK ("fee" >= 0);

-- 🚨 CONSTRAINT: Ensure platform fees are non-negative
ALTER TABLE "internal_transfers" 
ADD CONSTRAINT "non_negative_platform_fee_check" 
CHECK ("platformFee" >= 0);

-- 🚨 CONSTRAINT: Ensure exchange rates are positive when present
ALTER TABLE "wise_transactions" 
ADD CONSTRAINT "positive_exchange_rate_check" 
CHECK ("exchangeRate" IS NULL OR "exchangeRate" > 0);

-- 🛡️ FINANCIAL INTEGRITY: Ensure completed transfers have completion timestamp
ALTER TABLE "wise_transactions" 
ADD CONSTRAINT "completed_status_has_timestamp_check" 
CHECK (("status" != 'COMPLETED') OR ("completedAt" IS NOT NULL));

-- 🛡️ FINANCIAL INTEGRITY: Ensure internal transfers have completion timestamp when completed
ALTER TABLE "internal_transfers" 
ADD CONSTRAINT "completed_internal_transfer_has_timestamp_check" 
CHECK (("status" != 'COMPLETED') OR ("completedAt" IS NOT NULL));

-- 📝 AUDIT TRAIL: Create indexes for financial audit queries
CREATE INDEX "wise_transactions_status_created_idx" ON "wise_transactions"("status", "createdAt");
CREATE INDEX "wise_transactions_amount_created_idx" ON "wise_transactions"("amount", "createdAt");
CREATE INDEX "wise_accounts_balance_updated_idx" ON "wise_accounts"("lastBalance", "balanceUpdatedAt");
CREATE INDEX "internal_transfers_amount_status_idx" ON "internal_transfers"("amount", "status");

-- 💾 COMMENT: Document critical constraints for future maintenance
COMMENT ON CONSTRAINT "positive_balance_check" ON "wise_accounts" IS 'FINTECH SAFETY: Prevents negative account balances that could indicate data corruption or fraud';
COMMENT ON CONSTRAINT "non_zero_amount_check" ON "wise_transactions" IS 'FINTECH SAFETY: Prevents zero-amount transactions that could indicate system errors';
COMMENT ON CONSTRAINT "positive_transfer_amount_check" ON "internal_transfers" IS 'FINTECH SAFETY: Ensures all transfers move positive amounts of money';
COMMENT ON CONSTRAINT "non_negative_fee_check" ON "wise_transactions" IS 'FINTECH SAFETY: Prevents negative fees that could indicate calculation errors';