-- Clear all users and related data
-- WARNING: This will delete ALL user data permanently

-- Delete in proper order due to foreign key constraints
DELETE FROM "bank_transactions";
DELETE FROM "bank_accounts";
DELETE FROM "internal_transfers";
DELETE FROM "transactions";
DELETE FROM "beneficiaries";
DELETE FROM "sessions";
DELETE FROM "users";

-- Reset sequences if needed
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;