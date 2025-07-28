# Backend Scripts

This folder contains utility scripts for development, testing, and maintenance.

## Structure

### `/development/`
Contains scripts useful for ongoing development and debugging:
- Account verification scripts
- Currency testing utilities
- Exchange rate management
- Development helpers

### `/archive/`
Contains one-time setup scripts that were used during initial development:
- Historical account creation scripts
- Experimental implementations
- Debugging scripts from specific issues

## Usage

Run scripts from the backend directory:
```bash
cd backend
npx tsx scripts/development/script-name.ts
```

## Important Notes

- These scripts use the same OBP-API configuration as the main application
- Always verify script behavior in development before running in production
- Scripts may modify account balances and create test data