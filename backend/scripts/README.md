# Backend Scripts Directory

This directory contains all scripts for managing the remittance app backend infrastructure.

## 📁 Directory Structure

### `/production/` - Production Operations
- `deploy-production-migrations.sh` - Safe production database migrations
- `create-database-backup.sh` - Automated database backup with integrity verification

### `/setup/` - One-time Setup Scripts
- `setup-complete-obp.sh` - Complete OBP-API setup (banks, accounts, permissions)
- `fund-master-accounts.sh` - Fund EURBANK master account for transfers
- `test-obp-setup.sh` - Verify OBP-API connectivity and configuration

### `/maintenance/` - Database & System Maintenance
- `check-user-balance.js` - Debug user account balances and transactions
- `check-obp-accounts.sh` - Verify OBP-API accounts and balances
- `clear-users.sql` - Development database cleanup (⚠️ destructive)

### `/development/` - Development Utilities
- Various TypeScript scripts for testing specific features
- Safe to experiment and modify during development

### `/archive/` - Historical Scripts
- Legacy scripts kept for reference
- Not used in current development

## 🚀 Usage Examples

```bash
# Setup new environment
./setup/setup-complete-obp.sh
./setup/fund-master-accounts.sh

# Production deployment
./production/deploy-production-migrations.sh
./production/create-database-backup.sh

# Development debugging
node maintenance/check-user-balance.js
./maintenance/check-obp-accounts.sh
```

## 🔒 Security Notes

- All scripts contain sensitive credentials from CLAUDE.md
- Never commit real production credentials to git
- Scripts are designed for development/staging environments
- Production scripts require explicit confirmation prompts